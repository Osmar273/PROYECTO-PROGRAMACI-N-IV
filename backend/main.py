import os
import shutil
from fastapi import FastAPI, Depends, HTTPException, status, Request, File, UploadFile
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date
from pydantic import BaseModel
import uuid
import hashlib
import traceback

import models
import schemas
from database import engine, get_db, init_db

os.makedirs("static/perfiles", exist_ok=True)

def obtener_password_hash(password: str) -> str: return hashlib.sha256(password.encode("utf-8")).hexdigest()
def verificar_password(password_plano: str, password_hash: str) -> bool: return obtener_password_hash(password_plano) == password_hash

class LoginRequest(BaseModel): correo: str; password: str
class NotaDirectaCreate(BaseModel): id_inscripcion: int; nota: float; observacion: Optional[str] = "Nota Final"
class PerfilUpdate(BaseModel): direccion: Optional[str] = None; telefonoEmergencia: Optional[str] = None; telefono: Optional[str] = None
class InscripcionUpdate(BaseModel): estado: Optional[str] = None

app = FastAPI(title="API Sistema Académico", version="20.0.0")

@app.on_event("startup")
def startup_event(): init_db()

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=False, allow_methods=["*"], allow_headers=["*"], expose_headers=["*"])
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.exception_handler(Exception)
async def universal_exception_handler(request: Request, exc: Exception): 
    traceback.print_exc()
    return JSONResponse(status_code=500, content={"detail": f"Error Interno: {str(exc)}"}, headers={"Access-Control-Allow-Origin": "*"})

# --- SEGURIDAD Y PERFILES ---
@app.post("/api/login", tags=["Seguridad"])
def iniciar_sesion(credenciales: LoginRequest, db: Session = Depends(get_db)):
    usuario = db.query(models.Usuario).filter(models.Usuario.correo == credenciales.correo).first()
    if not usuario or not (usuario.password == credenciales.password or verificar_password(credenciales.password, usuario.password)): raise HTTPException(status_code=401, detail="Correo o contraseña incorrectos")
    if not usuario.estado: raise HTTPException(status_code=403, detail="El usuario está inactivo")
    return { "id_usuario": usuario.id_usuario, "correo": usuario.correo, "nombres": usuario.nombres, "apellidos": usuario.apellidos, "tipo_usuario": usuario.tipo_usuario, "fotoPerfil": usuario.fotoPerfil, "ci": usuario.ci, "direccion": usuario.direccion, "telefonoEmergencia": usuario.telefonoEmergencia }

@app.post("/api/usuarios/{id_usuario}/foto", tags=["Perfil"])
async def subir_foto_perfil(id_usuario: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    usuario = db.query(models.Usuario).filter(models.Usuario.id_usuario == id_usuario).first()
    extension = file.filename.split(".")[-1]; nombre_archivo = f"user_{id_usuario}_{uuid.uuid4().hex[:5]}.{extension}"; ruta_guardado = f"static/perfiles/{nombre_archivo}"
    with open(ruta_guardado, "wb") as buffer: shutil.copyfileobj(file.file, buffer)
    usuario.fotoPerfil = f"http://127.0.0.1:8000/{ruta_guardado}"; db.commit(); return {"mensaje": "Foto actualizada", "fotoPerfil": usuario.fotoPerfil}

@app.put("/api/usuarios/{id_usuario}/perfil", tags=["Perfil"])
def actualizar_datos_perfil(id_usuario: int, datos: PerfilUpdate, db: Session = Depends(get_db)):
    usuario = db.query(models.Usuario).filter(models.Usuario.id_usuario == id_usuario).first()
    if datos.direccion is not None: usuario.direccion = datos.direccion
    if datos.telefonoEmergencia is not None: usuario.telefonoEmergencia = datos.telefonoEmergencia
    if usuario.tipo_usuario == 'estudiante' and datos.telefono is not None:
        estudiante = db.query(models.Estudiante).filter(models.Estudiante.id_usuario == id_usuario).first()
        if estudiante: estudiante.telefono = datos.telefono
    db.commit(); return {"mensaje": "Perfil actualizado"}

@app.get("/api/roles", response_model=List[schemas.Rol], tags=["Roles"])
def listar_roles(db: Session = Depends(get_db)): return db.query(models.Rol).all()

# --- DOCENTES Y ESTUDIANTES CRUD ---
@app.post("/api/usuarios/docentes", response_model=schemas.Docente, tags=["Usuarios"])
def registrar_docente(docente: schemas.DocenteCreate, db: Session = Depends(get_db)):
    if db.query(models.Usuario).filter(models.Usuario.correo == docente.correo).first(): raise HTTPException(status_code=400, detail="El correo ya existe.")
    datos = { "nombres": docente.nombres, "apellidos": docente.apellidos, "ci": docente.ci, "id_rol": docente.id_rol, "correo": docente.correo, "password": obtener_password_hash(docente.password), "estado": docente.estado, "fechaCrea": date.today(), "tipo_usuario": "docente", "especialidad": docente.especialidad, "direccion": getattr(docente, 'direccion', None), "telefonoEmergencia": getattr(docente, 'telefonoEmergencia', None) }
    nuevo = models.Docente(**datos); db.add(nuevo); db.commit(); db.refresh(nuevo); return nuevo

@app.get("/api/usuarios/docentes", response_model=List[schemas.Docente], tags=["Usuarios"])
def listar_docentes(db: Session = Depends(get_db)): return db.query(models.Docente).all()

@app.put("/api/usuarios/docentes/{id_docente}", response_model=schemas.Docente, tags=["Usuarios"])
def actualizar_docente(id_docente: int, docente: schemas.DocenteCreate, db: Session = Depends(get_db)):
    doc_db = db.query(models.Docente).filter(models.Docente.id_usuario == id_docente).first()
    doc_db.nombres = docente.nombres; doc_db.apellidos = docente.apellidos; doc_db.ci = docente.ci; doc_db.correo = docente.correo; doc_db.especialidad = docente.especialidad; doc_db.direccion = docente.direccion; doc_db.telefonoEmergencia = docente.telefonoEmergencia
    if docente.password and docente.password.strip() != "": doc_db.password = obtener_password_hash(docente.password)
    db.commit(); db.refresh(doc_db); return doc_db

@app.delete("/api/usuarios/docentes/{id_docente}", tags=["Usuarios"])
def eliminar_docente(id_docente: int, db: Session = Depends(get_db)):
    docente = db.query(models.Docente).filter(models.Docente.id_usuario == id_docente).first()
    db.delete(docente); db.commit(); return {"mensaje": "Eliminado"}

@app.post("/api/usuarios/estudiantes", response_model=schemas.Estudiante, tags=["Usuarios"])
def registrar_estudiante(estudiante: schemas.EstudianteCreate, db: Session = Depends(get_db)):
    if db.query(models.Usuario).filter(models.Usuario.correo == estudiante.correo).first(): raise HTTPException(status_code=400, detail="El correo ya existe.")
    codigo = f"EST-{date.today().year}-{uuid.uuid4().hex[:5].upper()}"
    datos = { "nombres": estudiante.nombres, "apellidos": estudiante.apellidos, "ci": estudiante.ci, "id_rol": estudiante.id_rol, "correo": estudiante.correo, "password": obtener_password_hash(estudiante.password), "estado": estudiante.estado, "fechaCrea": date.today(), "tipo_usuario": "estudiante", "codEstudiante": codigo, "telefono": estudiante.telefono, "genero": estudiante.genero, "direccion": getattr(estudiante, 'direccion', None), "telefonoEmergencia": getattr(estudiante, 'telefonoEmergencia', None) }
    nuevo = models.Estudiante(**datos); db.add(nuevo); db.commit(); db.refresh(nuevo); return nuevo

@app.get("/api/usuarios/estudiantes", response_model=List[schemas.Estudiante], tags=["Usuarios"])
def listar_estudiantes(db: Session = Depends(get_db)): return db.query(models.Estudiante).all()

@app.put("/api/usuarios/estudiantes/{id_estudiante}", response_model=schemas.Estudiante, tags=["Usuarios"])
def actualizar_estudiante(id_estudiante: int, estudiante: schemas.EstudianteCreate, db: Session = Depends(get_db)):
    est_db = db.query(models.Estudiante).filter(models.Estudiante.id_usuario == id_estudiante).first()
    est_db.nombres = estudiante.nombres; est_db.apellidos = estudiante.apellidos; est_db.ci = estudiante.ci; est_db.correo = estudiante.correo; est_db.telefono = estudiante.telefono; est_db.genero = estudiante.genero; est_db.direccion = estudiante.direccion; est_db.telefonoEmergencia = estudiante.telefonoEmergencia
    if estudiante.password and estudiante.password.strip() != "": est_db.password = obtener_password_hash(estudiante.password)
    db.commit(); db.refresh(est_db); return est_db

@app.delete("/api/usuarios/estudiantes/{id_estudiante}", tags=["Usuarios"])
def eliminar_estudiante(id_estudiante: int, db: Session = Depends(get_db)):
    est = db.query(models.Estudiante).filter(models.Estudiante.id_usuario == id_estudiante).first()
    db.delete(est); db.commit(); return {"mensaje": "Eliminado"}

# --- INSTITUCIONAL Y ACADÉMICO ---
@app.get("/api/facultades", response_model=List[schemas.Facultad], tags=["Institucional"])
def listar_facultades(db: Session = Depends(get_db)): return db.query(models.Facultad).all()

@app.get("/api/modalidades", response_model=List[schemas.Modalidad], tags=["Institucional"])
def listar_modalidades(db: Session = Depends(get_db)): return db.query(models.Modalidad).all()

@app.get("/api/periodos", response_model=List[schemas.Periodo], tags=["Institucional"])
def listar_periodos(db: Session = Depends(get_db)): return db.query(models.Periodo).all()

@app.post("/api/carreras", response_model=schemas.Carrera, tags=["Institucional"])
def crear_carrera(carrera: schemas.CarreraCreate, db: Session = Depends(get_db)):
    nueva = models.Carrera(**carrera.model_dump()); db.add(nueva); db.commit(); db.refresh(nueva); return nueva

@app.get("/api/carreras", response_model=List[schemas.Carrera], tags=["Institucional"])
def listar_carreras(db: Session = Depends(get_db)): return db.query(models.Carrera).all()

@app.put("/api/carreras/{id_carrera}", response_model=schemas.Carrera, tags=["Institucional"])
def actualizar_carrera(id_carrera: int, carrera: schemas.CarreraCreate, db: Session = Depends(get_db)):
    c_db = db.query(models.Carrera).filter(models.Carrera.id_carrera == id_carrera).first()
    for key, value in carrera.model_dump().items(): setattr(c_db, key, value)
    db.commit(); db.refresh(c_db); return c_db

@app.delete("/api/carreras/{id_carrera}", tags=["Institucional"])
def eliminar_carrera(id_carrera: int, db: Session = Depends(get_db)):
    carrera = db.query(models.Carrera).filter(models.Carrera.id_carrera == id_carrera).first()
    db.delete(carrera); db.commit(); return {"mensaje": "Eliminada"}

@app.post("/api/materias", response_model=schemas.Materia, tags=["Académico"])
def crear_materia(materia: schemas.MateriaCreate, db: Session = Depends(get_db)):
    nueva = models.Materia(**materia.model_dump()); db.add(nueva); db.commit(); db.refresh(nueva); return nueva

@app.get("/api/materias", response_model=List[schemas.Materia], tags=["Académico"])
def listar_materias(db: Session = Depends(get_db)): return db.query(models.Materia).all()

@app.put("/api/materias/{id_materia}", response_model=schemas.Materia, tags=["Académico"])
def actualizar_materia(id_materia: int, materia: schemas.MateriaCreate, db: Session = Depends(get_db)):
    m_db = db.query(models.Materia).filter(models.Materia.id_materia == id_materia).first()
    for key, value in materia.model_dump().items(): setattr(m_db, key, value)
    db.commit(); db.refresh(m_db); return m_db

@app.delete("/api/materias/{id_materia}", tags=["Académico"])
def eliminar_materia(id_materia: int, db: Session = Depends(get_db)):
    materia = db.query(models.Materia).filter(models.Materia.id_materia == id_materia).first()
    db.delete(materia); db.commit(); return {"mensaje": "Eliminada"}

@app.post("/api/materias/prerequisitos", response_model=schemas.MatPrerequisito, tags=["Académico"])
def agregar_prerequisito(prereq: schemas.MatPrerequisitoCreate, db: Session = Depends(get_db)):
    existe = db.query(models.MatPrerequisito).filter(models.MatPrerequisito.id_materia == prereq.id_materia, models.MatPrerequisito.id_prerequisito == prereq.id_prerequisito).first()
    if existe: raise HTTPException(status_code=400, detail="Regla ya existe.")
    nuevo = models.MatPrerequisito(**prereq.model_dump()); db.add(nuevo); db.commit(); db.refresh(nuevo); return nuevo

@app.get("/api/materias/{id_materia}/prerequisitos", tags=["Académico"])
def listar_prerequisitos(id_materia: int, db: Session = Depends(get_db)): return db.query(models.MatPrerequisito).filter(models.MatPrerequisito.id_materia == id_materia).all()

@app.delete("/api/materias/prerequisitos/{id_materia}/{id_prerequisito}", tags=["Académico"])
def eliminar_prerequisito(id_materia: int, id_prerequisito: int, db: Session = Depends(get_db)):
    prereq = db.query(models.MatPrerequisito).filter(models.MatPrerequisito.id_materia == id_materia, models.MatPrerequisito.id_prerequisito == id_prerequisito).first()
    db.delete(prereq); db.commit(); return {"mensaje": "Eliminado"}

@app.post("/api/aulas", response_model=schemas.Aula, tags=["Institucional"])
def crear_aula(aula: schemas.AulaCreate, db: Session = Depends(get_db)):
    nueva = models.Aula(**aula.model_dump()); db.add(nueva); db.commit(); db.refresh(nueva); return nueva

@app.get("/api/aulas", response_model=List[schemas.Aula], tags=["Institucional"])
def listar_aulas(db: Session = Depends(get_db)): return db.query(models.Aula).all()

@app.put("/api/aulas/{id_aula}", response_model=schemas.Aula, tags=["Institucional"])
def actualizar_aula(id_aula: int, aula: schemas.AulaCreate, db: Session = Depends(get_db)):
    a_db = db.query(models.Aula).filter(models.Aula.id_aula == id_aula).first()
    for key, value in aula.model_dump().items(): setattr(a_db, key, value)
    db.commit(); db.refresh(a_db); return a_db

@app.delete("/api/aulas/{id_aula}", tags=["Institucional"])
def eliminar_aula(id_aula: int, db: Session = Depends(get_db)):
    aula = db.query(models.Aula).filter(models.Aula.id_aula == id_aula).first()
    db.delete(aula); db.commit(); return {"mensaje": "Eliminada"}

# ==========================================
# GRUPOS Y CHOQUE DE AULAS/DOCENTES 
# ==========================================
@app.post("/api/grupos", response_model=schemas.Grupo, tags=["Académico"])
def crear_grupo(grupo: schemas.GrupoCreate, db: Session = Depends(get_db)):
    if grupo.horaInicio and grupo.horaFin:
        if grupo.id_aula:
            choque_aula = db.query(models.Grupo).filter(
                models.Grupo.id_periodo == grupo.id_periodo,
                models.Grupo.id_aula == grupo.id_aula,
                models.Grupo.estado == True,
                models.Grupo.horaInicio < grupo.horaFin,
                models.Grupo.horaFin > grupo.horaInicio
            ).first()
            if choque_aula: raise HTTPException(status_code=400, detail=f"¡CHOQUE DE AULA! {grupo.turno} ocupado por Grupo {choque_aula.seccion}.")
        
        choque_docente = db.query(models.Grupo).filter(
            models.Grupo.id_periodo == grupo.id_periodo,
            models.Grupo.id_docente == grupo.id_docente,
            models.Grupo.turno == grupo.turno, 
            models.Grupo.estado == True,
            models.Grupo.horaInicio < grupo.horaFin,
            models.Grupo.horaFin > grupo.horaInicio
        ).first()
        if choque_docente: raise HTTPException(status_code=400, detail=f"¡CHOQUE DE HORARIO! El docente ya dicta clases en el turno {grupo.turno} (Grupo {choque_docente.seccion}).")

    nuevo = models.Grupo(**grupo.model_dump()); nuevo.cupoDisp = grupo.cupoMax
    db.add(nuevo); db.commit(); db.refresh(nuevo); return nuevo

@app.put("/api/grupos/{id_grupo}", response_model=schemas.Grupo, tags=["Académico"])
def actualizar_grupo(id_grupo: int, grupo: schemas.GrupoCreate, db: Session = Depends(get_db)):
    g_db = db.query(models.Grupo).filter(models.Grupo.id_grupo == id_grupo).first()
    if not g_db: raise HTTPException(status_code=404, detail="No encontrado")

    if grupo.horaInicio and grupo.horaFin:
        if grupo.id_aula:
            choque_aula = db.query(models.Grupo).filter(models.Grupo.id_grupo != id_grupo, models.Grupo.id_periodo == grupo.id_periodo, models.Grupo.id_aula == grupo.id_aula, models.Grupo.estado == True, models.Grupo.horaInicio < grupo.horaFin, models.Grupo.horaFin > grupo.horaInicio).first()
            if choque_aula: raise HTTPException(status_code=400, detail=f"¡CHOQUE DE AULA! Ocupada por el Grupo {choque_aula.seccion}.")
        
        choque_docente = db.query(models.Grupo).filter(models.Grupo.id_grupo != id_grupo, models.Grupo.id_periodo == grupo.id_periodo, models.Grupo.id_docente == grupo.id_docente, models.Grupo.turno == grupo.turno, models.Grupo.estado == True, models.Grupo.horaInicio < grupo.horaFin, models.Grupo.horaFin > grupo.horaInicio).first()
        if choque_docente: raise HTTPException(status_code=400, detail=f"¡CHOQUE DE HORARIO! Docente ya tiene clases en el turno {grupo.turno} (Grupo {choque_docente.seccion}).")

    diferencia = grupo.cupoMax - g_db.cupoMax; g_db.cupoDisp = g_db.cupoDisp + diferencia
    g_db.seccion = grupo.seccion; g_db.cupoMax = grupo.cupoMax; g_db.id_materia = grupo.id_materia; g_db.id_docente = grupo.id_docente; g_db.id_periodo = grupo.id_periodo; g_db.turno = grupo.turno; g_db.id_aula = grupo.id_aula; g_db.horaInicio = grupo.horaInicio; g_db.horaFin = grupo.horaFin
    db.commit(); db.refresh(g_db); return g_db

@app.delete("/api/grupos/{id_grupo}", tags=["Académico"])
def eliminar_grupo(id_grupo: int, db: Session = Depends(get_db)):
    grupo = db.query(models.Grupo).filter(models.Grupo.id_grupo == id_grupo).first()
    db.delete(grupo); db.commit(); return {"mensaje": "Eliminado"}

# ==========================================
# RUTAS DE LECTURA DE GRUPOS BLINDADAS
# ==========================================
@app.get("/api/grupos", tags=["Académico"])
def listar_grupos(db: Session = Depends(get_db)):
    grupos = db.query(models.Grupo).all()
    resultado = []
    for g in grupos:
        resultado.append({
            "id_grupo": g.id_grupo,
            "seccion": g.seccion,
            "cupoMax": g.cupoMax,
            "cupoDisp": g.cupoDisp,
            "id_materia": g.id_materia,
            "id_docente": g.id_docente,
            "id_periodo": g.id_periodo,
            "turno": g.turno,
            "id_aula": g.id_aula,
            "horaInicio": str(g.horaInicio) if g.horaInicio else None,
            "horaFin": str(g.horaFin) if g.horaFin else None,
            "estado": g.estado
        })
    return resultado

@app.get("/api/grupos/disponibles", tags=["Académico"])
def listar_grupos_disponibles(db: Session = Depends(get_db)):
    grupos = db.query(models.Grupo).filter(models.Grupo.estado == True).all()
    resultado = []
    for g in grupos:
        resultado.append({
            "id_grupo": g.id_grupo,
            "seccion": g.seccion,
            "cupoMax": g.cupoMax,
            "cupoDisp": g.cupoDisp,
            "id_materia": g.id_materia,
            "id_docente": g.id_docente,
            "id_periodo": g.id_periodo,
            "turno": g.turno,
            "id_aula": g.id_aula,
            "horaInicio": str(g.horaInicio) if g.horaInicio else None,
            "horaFin": str(g.horaFin) if g.horaFin else None,
            "estado": g.estado
        })
    return resultado

# --- INSCRIPCIONES Y NOTAS GLOBALES ---
@app.post("/api/inscripciones", response_model=schemas.Inscripcion, tags=["Transacciones"])
def registrar_inscripcion(inscripcion: schemas.InscripcionCreate, db: Session = Depends(get_db)):
    grupo = db.query(models.Grupo).filter(models.Grupo.id_grupo == inscripcion.id_grupo).first()
    if grupo.cupoDisp <= 0: raise HTTPException(status_code=400, detail="No hay cupos en este grupo.")
    existe = db.query(models.Inscripcion).filter(models.Inscripcion.id_estudiante == inscripcion.id_estudiante, models.Inscripcion.id_grupo == inscripcion.id_grupo).first()
    if existe: raise HTTPException(status_code=400, detail="Ya estás inscrito.")
    prerequisitos = db.query(models.MatPrerequisito).filter(models.MatPrerequisito.id_materia == grupo.id_materia).all()
    for req in prerequisitos:
        aprobado = db.query(models.Inscripcion).join(models.Grupo).filter(models.Inscripcion.id_estudiante == inscripcion.id_estudiante, models.Grupo.id_materia == req.id_prerequisito, models.Inscripcion.estado == 'Aprobado').first()
        if not aprobado:
            mat_req = db.query(models.Materia).filter(models.Materia.id_materia == req.id_prerequisito).first()
            raise HTTPException(status_code=400, detail=f"RECHAZADO: Necesitas aprobar '{mat_req.nombre}' primero.")
    nueva = models.Inscripcion(**inscripcion.model_dump()); db.add(nueva); grupo.cupoDisp -= 1; db.commit(); db.refresh(nueva); return nueva

@app.get("/api/inscripciones/estudiante/{id_estudiante}", response_model=List[schemas.Inscripcion], tags=["Transacciones"])
def listar_inscripciones_estudiante(id_estudiante: int, db: Session = Depends(get_db)): return db.query(models.Inscripcion).filter(models.Inscripcion.id_estudiante == id_estudiante).all()

@app.put("/api/inscripciones/{id_inscripcion}", response_model=schemas.Inscripcion, tags=["Transacciones"])
def actualizar_inscripcion(id_inscripcion: int, datos: InscripcionUpdate, db: Session = Depends(get_db)):
    inscripcion = db.query(models.Inscripcion).filter(models.Inscripcion.id_inscripcion == id_inscripcion).first()
    if datos.estado is not None: inscripcion.estado = datos.estado
    db.commit(); db.refresh(inscripcion); return inscripcion

# ==========================================
# SISTEMA DE EVALUACIONES DINÁMICAS (COLUMNAS LIBRES)
# ==========================================
@app.post("/api/evaluaciones", response_model=schemas.Evaluacion, tags=["Calificaciones"])
def crear_evaluacion(evaluacion: schemas.EvaluacionCreate, db: Session = Depends(get_db)):
    nueva = models.Evaluacion(**evaluacion.model_dump()); db.add(nueva); db.commit(); db.refresh(nueva); return nueva

@app.get("/api/evaluaciones/grupo/{id_grupo}", response_model=List[schemas.Evaluacion], tags=["Calificaciones"])
def listar_evaluaciones_grupo(id_grupo: int, db: Session = Depends(get_db)):
    return db.query(models.Evaluacion).filter(models.Evaluacion.id_grupo == id_grupo).all()

@app.delete("/api/evaluaciones/{id_evaluacion}", tags=["Calificaciones"])
def eliminar_evaluacion(id_evaluacion: int, db: Session = Depends(get_db)):
    ev = db.query(models.Evaluacion).filter(models.Evaluacion.id_evaluacion == id_evaluacion).first()
    db.delete(ev); db.commit(); return {"mensaje": "Eliminada"}

@app.post("/api/notas/evaluacion", response_model=schemas.Nota, tags=["Calificaciones"])
def guardar_nota_celda(nota: schemas.NotaCreate, db: Session = Depends(get_db)):
    nota_db = db.query(models.Nota).filter(models.Nota.id_inscripcion == nota.id_inscripcion, models.Nota.id_evaluacion == nota.id_evaluacion).first()
    if nota_db:
        nota_db.nota = nota.nota
        db.commit(); db.refresh(nota_db); return nota_db
    nueva = models.Nota(**nota.model_dump()); db.add(nueva); db.commit(); db.refresh(nueva); return nueva

@app.get("/api/notas", response_model=List[schemas.Nota], tags=["Calificaciones"])
def listar_notas(db: Session = Depends(get_db)): return db.query(models.Nota).all()