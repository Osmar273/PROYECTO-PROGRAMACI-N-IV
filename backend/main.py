import os
import shutil
from fastapi import FastAPI, Depends, HTTPException, status, Request, File, UploadFile
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import List, Optional
from datetime import date
from pydantic import BaseModel
import uuid
import hashlib
import traceback

import models
import schemas
from database import engine, get_db, init_db

# ==========================================
# GESTOR DE DIRECTORIOS DE IMÁGENES
# ==========================================
os.makedirs("static/perfiles", exist_ok=True)

def obtener_password_hash(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()

def verificar_password(password_plano: str, password_hash: str) -> bool:
    return obtener_password_hash(password_plano) == password_hash

class LoginRequest(BaseModel):
    correo: str
    password: str

class NotaDirectaCreate(BaseModel):
    id_inscripcion: int
    nota: float
    observacion: Optional[str] = "Nota Final"

class PerfilUpdate(BaseModel):
    direccion: Optional[str] = None
    telefonoEmergencia: Optional[str] = None
    telefono: Optional[str] = None # Para el celular del estudiante

class InscripcionUpdate(BaseModel):
    estado: Optional[str] = None

app = FastAPI(title="API Sistema Académico", version="13.0.0")

@app.on_event("startup")
def startup_event():
    init_db()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=False, 
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Servidor estático para poder ver las fotos en la web
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail}, headers={"Access-Control-Allow-Origin": "*"})

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(status_code=422, content={"detail": f"Datos incorrectos: {exc.errors()}"}, headers={"Access-Control-Allow-Origin": "*"})

@app.exception_handler(Exception)
async def universal_exception_handler(request: Request, exc: Exception):
    traceback.print_exc()
    return JSONResponse(status_code=500, content={"detail": f"Error Interno: {str(exc)}"}, headers={"Access-Control-Allow-Origin": "*"})

# ==========================================
# SEGURIDAD Y LOGIN 
# ==========================================
@app.post("/api/login", tags=["Seguridad"])
def iniciar_sesion(credenciales: LoginRequest, db: Session = Depends(get_db)):
    usuario = db.query(models.Usuario).filter(models.Usuario.correo == credenciales.correo).first()
    if not usuario: raise HTTPException(status_code=401, detail="Correo o contraseña incorrectos")
    
    password_valida = False
    if usuario.password == credenciales.password: password_valida = True
    elif verificar_password(credenciales.password, usuario.password): password_valida = True

    if not password_valida: raise HTTPException(status_code=401, detail="Correo o contraseña incorrectos")
    if not usuario.estado: raise HTTPException(status_code=403, detail="El usuario está inactivo")
        
    return {
        "id_usuario": usuario.id_usuario, "correo": usuario.correo,
        "nombres": usuario.nombres, "apellidos": usuario.apellidos, "tipo_usuario": usuario.tipo_usuario,
        "fotoPerfil": usuario.fotoPerfil, "ci": usuario.ci, "direccion": usuario.direccion,
        "telefonoEmergencia": usuario.telefonoEmergencia
    }

# ==========================================
# SUBIDA DE FOTOS Y ACTUALIZACIÓN DE PERFIL
# ==========================================
@app.post("/api/usuarios/{id_usuario}/foto", tags=["Perfil"])
async def subir_foto_perfil(id_usuario: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    usuario = db.query(models.Usuario).filter(models.Usuario.id_usuario == id_usuario).first()
    if not usuario: raise HTTPException(status_code=404, detail="Usuario no encontrado")

    extension = file.filename.split(".")[-1]
    nombre_archivo = f"user_{id_usuario}_{uuid.uuid4().hex[:5]}.{extension}"
    ruta_guardado = f"static/perfiles/{nombre_archivo}"

    with open(ruta_guardado, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    url_foto = f"http://127.0.0.1:8000/{ruta_guardado}"
    usuario.fotoPerfil = url_foto
    db.commit()
    return {"mensaje": "Foto actualizada", "fotoPerfil": url_foto}

@app.put("/api/usuarios/{id_usuario}/perfil", tags=["Perfil"])
def actualizar_datos_perfil(id_usuario: int, datos: PerfilUpdate, db: Session = Depends(get_db)):
    usuario = db.query(models.Usuario).filter(models.Usuario.id_usuario == id_usuario).first()
    if not usuario: raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    if datos.direccion is not None: usuario.direccion = datos.direccion
    if datos.telefonoEmergencia is not None: usuario.telefonoEmergencia = datos.telefonoEmergencia
    
    if usuario.tipo_usuario == 'estudiante' and datos.telefono is not None:
        estudiante = db.query(models.Estudiante).filter(models.Estudiante.id_usuario == id_usuario).first()
        if estudiante: estudiante.telefono = datos.telefono

    db.commit()
    return {"mensaje": "Perfil actualizado correctamente"}

# ==========================================
# ROLES Y USUARIOS 
# ==========================================
@app.get("/api/roles", response_model=List[schemas.Rol], tags=["Roles"])
def listar_roles(db: Session = Depends(get_db)): return db.query(models.Rol).all()

# --- DOCENTES ---
@app.post("/api/usuarios/docentes", response_model=schemas.Docente, tags=["Usuarios"])
def registrar_docente(docente: schemas.DocenteCreate, db: Session = Depends(get_db)):
    if db.query(models.Usuario).filter(models.Usuario.correo == docente.correo).first(): raise HTTPException(status_code=400, detail="El correo ya existe.")
    if db.query(models.Usuario).filter(models.Usuario.ci == docente.ci).first(): raise HTTPException(status_code=400, detail="El CI ya existe.")
    
    datos = {
        "nombres": docente.nombres, "apellidos": docente.apellidos, "ci": docente.ci,
        "id_rol": docente.id_rol, "correo": docente.correo, "password": obtener_password_hash(docente.password),
        "estado": docente.estado, "fechaCrea": date.today(), "tipo_usuario": "docente",
        "especialidad": docente.especialidad,
        "direccion": getattr(docente, 'direccion', None),
        "telefonoEmergencia": getattr(docente, 'telefonoEmergencia', None)
    }
    if hasattr(models.Docente, 'fechaIngreso'): datos['fechaIngreso'] = getattr(docente, 'fechaIngreso', None)
    elif hasattr(models.Docente, 'fechalngreso'): datos['fechalngreso'] = getattr(docente, 'fechaIngreso', getattr(docente, 'fechalngreso', None))

    nuevo = models.Docente(**datos)
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo

@app.get("/api/usuarios/docentes", response_model=List[schemas.Docente], tags=["Usuarios"])
def listar_docentes(db: Session = Depends(get_db)): return db.query(models.Docente).all()

@app.put("/api/usuarios/docentes/{id_docente}", response_model=schemas.Docente, tags=["Usuarios"])
def actualizar_docente(id_docente: int, docente: schemas.DocenteCreate, db: Session = Depends(get_db)):
    doc_db = db.query(models.Docente).filter(models.Docente.id_usuario == id_docente).first()
    if not doc_db: raise HTTPException(status_code=404, detail="Docente no encontrado")
    doc_db.nombres = docente.nombres
    doc_db.apellidos = docente.apellidos
    doc_db.ci = docente.ci
    doc_db.correo = docente.correo
    doc_db.especialidad = docente.especialidad
    if docente.password and docente.password.strip() != "": doc_db.password = obtener_password_hash(docente.password)
    fecha_ing = getattr(docente, 'fechaIngreso', getattr(docente, 'fechalngreso', None))
    if hasattr(models.Docente, 'fechaIngreso'): doc_db.fechaIngreso = fecha_ing
    elif hasattr(models.Docente, 'fechalngreso'): doc_db.fechalngreso = fecha_ing
    db.commit()
    db.refresh(doc_db)
    return doc_db

@app.delete("/api/usuarios/docentes/{id_docente}", tags=["Usuarios"])
def eliminar_docente(id_docente: int, db: Session = Depends(get_db)):
    docente = db.query(models.Docente).filter(models.Docente.id_usuario == id_docente).first()
    if not docente: raise HTTPException(status_code=404, detail="Docente no encontrado")
    db.delete(docente)
    db.commit()
    return {"mensaje": "Docente eliminado"}

# --- ESTUDIANTES ---
@app.post("/api/usuarios/estudiantes", response_model=schemas.Estudiante, tags=["Usuarios"])
def registrar_estudiante(estudiante: schemas.EstudianteCreate, db: Session = Depends(get_db)):
    if db.query(models.Usuario).filter(models.Usuario.correo == estudiante.correo).first(): raise HTTPException(status_code=400, detail="El correo ya existe.")
    if db.query(models.Usuario).filter(models.Usuario.ci == estudiante.ci).first(): raise HTTPException(status_code=400, detail="El CI ya existe.")
    
    codigo = f"EST-{date.today().year}-{uuid.uuid4().hex[:5].upper()}"
    datos = {
        "nombres": estudiante.nombres, "apellidos": estudiante.apellidos, "ci": estudiante.ci,
        "id_rol": estudiante.id_rol, "correo": estudiante.correo, "password": obtener_password_hash(estudiante.password),
        "estado": estudiante.estado, "fechaCrea": date.today(), "tipo_usuario": "estudiante",
        "codEstudiante": codigo, "telefono": estudiante.telefono, "genero": estudiante.genero,
        "direccion": getattr(estudiante, 'direccion', None),
        "telefonoEmergencia": getattr(estudiante, 'telefonoEmergencia', None)
    }
    if hasattr(models.Estudiante, 'fechaIngreso'): datos['fechaIngreso'] = getattr(estudiante, 'fechaIngreso', None)
    elif hasattr(models.Estudiante, 'fechalngreso'): datos['fechalngreso'] = getattr(estudiante, 'fechaIngreso', getattr(estudiante, 'fechalngreso', None))

    nuevo = models.Estudiante(**datos)
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo

@app.get("/api/usuarios/estudiantes", response_model=List[schemas.Estudiante], tags=["Usuarios"])
def listar_estudiantes(db: Session = Depends(get_db)): return db.query(models.Estudiante).all()

@app.put("/api/usuarios/estudiantes/{id_estudiante}", response_model=schemas.Estudiante, tags=["Usuarios"])
def actualizar_estudiante(id_estudiante: int, estudiante: schemas.EstudianteCreate, db: Session = Depends(get_db)):
    est_db = db.query(models.Estudiante).filter(models.Estudiante.id_usuario == id_estudiante).first()
    if not est_db: raise HTTPException(status_code=404, detail="Estudiante no encontrado")
    est_db.nombres = estudiante.nombres
    est_db.apellidos = estudiante.apellidos
    est_db.ci = estudiante.ci
    est_db.correo = estudiante.correo
    est_db.telefono = estudiante.telefono
    est_db.genero = estudiante.genero
    if estudiante.password and estudiante.password.strip() != "": est_db.password = obtener_password_hash(estudiante.password)
    fecha_ing = getattr(estudiante, 'fechaIngreso', getattr(estudiante, 'fechalngreso', None))
    if hasattr(models.Estudiante, 'fechaIngreso'): est_db.fechaIngreso = fecha_ing
    elif hasattr(models.Estudiante, 'fechalngreso'): est_db.fechalngreso = fecha_ing
    db.commit()
    db.refresh(est_db)
    return est_db

@app.delete("/api/usuarios/estudiantes/{id_estudiante}", tags=["Usuarios"])
def eliminar_estudiante(id_estudiante: int, db: Session = Depends(get_db)):
    est = db.query(models.Estudiante).filter(models.Estudiante.id_usuario == id_estudiante).first()
    if not est: raise HTTPException(status_code=404, detail="Estudiante no encontrado")
    db.delete(est)
    db.commit()
    return {"mensaje": "Estudiante eliminado"}

# ==========================================
# INSTITUCIONAL Y ACADÉMICO
# ==========================================
@app.get("/api/facultades", response_model=List[schemas.Facultad], tags=["Institucional"])
def listar_facultades(db: Session = Depends(get_db)): return db.query(models.Facultad).all()

@app.get("/api/modalidades", response_model=List[schemas.Modalidad], tags=["Institucional"])
def listar_modalidades(db: Session = Depends(get_db)): return db.query(models.Modalidad).all()

@app.post("/api/carreras", response_model=schemas.Carrera, tags=["Institucional"])
def crear_carrera(carrera: schemas.CarreraCreate, db: Session = Depends(get_db)):
    if db.query(models.Carrera).filter(models.Carrera.codigo == carrera.codigo).first(): raise HTTPException(status_code=400, detail="Código de carrera ya existe.")
    nueva = models.Carrera(**carrera.model_dump())
    db.add(nueva)
    db.commit()
    db.refresh(nueva)
    return nueva

@app.get("/api/carreras", response_model=List[schemas.Carrera], tags=["Institucional"])
def listar_carreras(db: Session = Depends(get_db)): return db.query(models.Carrera).all()

@app.delete("/api/carreras/{id_carrera}", tags=["Institucional"])
def eliminar_carrera(id_carrera: int, db: Session = Depends(get_db)):
    carrera = db.query(models.Carrera).filter(models.Carrera.id_carrera == id_carrera).first()
    if not carrera: raise HTTPException(status_code=404, detail="Carrera no encontrada")
    db.delete(carrera)
    db.commit()
    return {"mensaje": "Carrera eliminada"}

@app.get("/api/periodos", response_model=List[schemas.Periodo], tags=["Institucional"])
def listar_periodos(db: Session = Depends(get_db)): return db.query(models.Periodo).all()

@app.post("/api/materias", response_model=schemas.Materia, tags=["Académico"])
def crear_materia(materia: schemas.MateriaCreate, db: Session = Depends(get_db)):
    if db.query(models.Materia).filter(models.Materia.codigo == materia.codigo).first(): raise HTTPException(status_code=400, detail="Sigla ya en uso.")
    nueva = models.Materia(**materia.model_dump())
    db.add(nueva)
    db.commit()
    db.refresh(nueva)
    return nueva

@app.get("/api/materias", response_model=List[schemas.Materia], tags=["Académico"])
def listar_materias(db: Session = Depends(get_db)): return db.query(models.Materia).all()

@app.delete("/api/materias/{id_materia}", tags=["Académico"])
def eliminar_materia(id_materia: int, db: Session = Depends(get_db)):
    materia = db.query(models.Materia).filter(models.Materia.id_materia == id_materia).first()
    if not materia: raise HTTPException(status_code=404, detail="Materia no encontrada")
    db.delete(materia)
    db.commit()
    return {"mensaje": "Materia eliminada"}

# --- PREREQUISITOS ---
@app.post("/api/materias/prerequisitos", response_model=schemas.MatPrerequisito, tags=["Académico"])
def agregar_prerequisito(prereq: schemas.MatPrerequisitoCreate, db: Session = Depends(get_db)):
    existe = db.query(models.MatPrerequisito).filter(
        models.MatPrerequisito.id_materia == prereq.id_materia,
        models.MatPrerequisito.id_prerequisito == prereq.id_prerequisito
    ).first()
    if existe: raise HTTPException(status_code=400, detail="Esta regla de prerequisito ya existe.")
    
    nuevo = models.MatPrerequisito(**prereq.model_dump())
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo

@app.get("/api/materias/{id_materia}/prerequisitos", tags=["Académico"])
def listar_prerequisitos(id_materia: int, db: Session = Depends(get_db)): 
    return db.query(models.MatPrerequisito).filter(models.MatPrerequisito.id_materia == id_materia).all()

@app.delete("/api/materias/prerequisitos/{id_materia}/{id_prerequisito}", tags=["Académico"])
def eliminar_prerequisito(id_materia: int, id_prerequisito: int, db: Session = Depends(get_db)):
    prereq = db.query(models.MatPrerequisito).filter(
        models.MatPrerequisito.id_materia == id_materia, 
        models.MatPrerequisito.id_prerequisito == id_prerequisito
    ).first()
    if not prereq: raise HTTPException(status_code=404, detail="Prerequisito no encontrado")
    db.delete(prereq)
    db.commit()
    return {"mensaje": "Prerequisito eliminado"}

# --- GRUPOS ---
@app.post("/api/grupos", response_model=schemas.Grupo, tags=["Académico"])
def crear_grupo(grupo: schemas.GrupoCreate, db: Session = Depends(get_db)):
    nuevo = models.Grupo(**grupo.model_dump())
    nuevo.cupoDisp = grupo.cupoMax
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo

@app.get("/api/grupos", response_model=List[schemas.Grupo], tags=["Académico"])
def listar_grupos(db: Session = Depends(get_db)): return db.query(models.Grupo).all()

@app.get("/api/grupos/disponibles", response_model=List[schemas.Grupo], tags=["Académico"])
def listar_grupos_disponibles(db: Session = Depends(get_db)): 
    # Devuelve todos para que el frontend del alumno detecte y bloquee los "Cupos Llenos" visualmente
    return db.query(models.Grupo).filter(models.Grupo.estado == True).all()

@app.delete("/api/grupos/{id_grupo}", tags=["Académico"])
def eliminar_grupo(id_grupo: int, db: Session = Depends(get_db)):
    grupo = db.query(models.Grupo).filter(models.Grupo.id_grupo == id_grupo).first()
    if not grupo: raise HTTPException(status_code=404, detail="Grupo no encontrado")
    db.delete(grupo)
    db.commit()
    return {"mensaje": "Grupo eliminado"}

# ==========================================
# TRANSACCIONES (INSCRIPCIONES Y NOTAS)
# ==========================================
@app.post("/api/inscripciones", response_model=schemas.Inscripcion, tags=["Transacciones"])
def registrar_inscripcion(inscripcion: schemas.InscripcionCreate, db: Session = Depends(get_db)):
    grupo = db.query(models.Grupo).filter(models.Grupo.id_grupo == inscripcion.id_grupo).first()
    if not grupo: raise HTTPException(status_code=404, detail="Grupo no existe.")
    if grupo.cupoDisp <= 0: raise HTTPException(status_code=400, detail="No hay cupos en este grupo.")
    
    existe = db.query(models.Inscripcion).filter(
        models.Inscripcion.id_estudiante == inscripcion.id_estudiante, 
        models.Inscripcion.id_grupo == inscripcion.id_grupo
    ).first()
    if existe: raise HTTPException(status_code=400, detail="Ya estás inscrito en esta materia.")

    # ==========================================
    # ESCUDO DE PREREQUISITOS
    # ==========================================
    prerequisitos = db.query(models.MatPrerequisito).filter(models.MatPrerequisito.id_materia == grupo.id_materia).all()
    for req in prerequisitos:
        aprobado = db.query(models.Inscripcion).join(models.Grupo).filter(
            models.Inscripcion.id_estudiante == inscripcion.id_estudiante,
            models.Grupo.id_materia == req.id_prerequisito,
            models.Inscripcion.estado == 'Aprobado'
        ).first()
        
        if not aprobado:
            mat_req = db.query(models.Materia).filter(models.Materia.id_materia == req.id_prerequisito).first()
            raise HTTPException(status_code=400, detail=f"RECHAZADO: Para tomar esta materia necesitas aprobar '{mat_req.nombre}' primero.")

    nueva = models.Inscripcion(**inscripcion.model_dump())
    db.add(nueva)
    grupo.cupoDisp -= 1
    db.commit()
    db.refresh(nueva)
    return nueva

@app.get("/api/inscripciones", response_model=List[schemas.Inscripcion], tags=["Transacciones"])
def listar_inscripciones(db: Session = Depends(get_db)): return db.query(models.Inscripcion).all()

@app.get("/api/inscripciones/estudiante/{id_estudiante}", response_model=List[schemas.Inscripcion], tags=["Transacciones"])
def listar_inscripciones_estudiante(id_estudiante: int, db: Session = Depends(get_db)): return db.query(models.Inscripcion).filter(models.Inscripcion.id_estudiante == id_estudiante).all()

@app.put("/api/inscripciones/{id_inscripcion}", response_model=schemas.Inscripcion, tags=["Transacciones"])
def actualizar_inscripcion(id_inscripcion: int, datos: InscripcionUpdate, db: Session = Depends(get_db)):
    inscripcion = db.query(models.Inscripcion).filter(models.Inscripcion.id_inscripcion == id_inscripcion).first()
    if not inscripcion: raise HTTPException(status_code=404, detail="Inscripción no encontrada")
    if datos.estado is not None: inscripcion.estado = datos.estado
    db.commit()
    db.refresh(inscripcion)
    return inscripcion

@app.delete("/api/inscripciones/{id_inscripcion}", tags=["Transacciones"])
def eliminar_inscripcion(id_inscripcion: int, db: Session = Depends(get_db)):
    inscripcion = db.query(models.Inscripcion).filter(models.Inscripcion.id_inscripcion == id_inscripcion).first()
    if not inscripcion: raise HTTPException(status_code=404, detail="Inscripción no encontrada")
    grupo = db.query(models.Grupo).filter(models.Grupo.id_grupo == inscripcion.id_grupo).first()
    if grupo: grupo.cupoDisp += 1
    db.delete(inscripcion)
    db.commit()
    return {"mensaje": "Inscripción eliminada"}

@app.post("/api/notas", response_model=schemas.Nota, tags=["Calificaciones"])
def crear_nota(nota: NotaDirectaCreate, db: Session = Depends(get_db)):
    nueva = models.Nota(id_inscripcion=nota.id_inscripcion, nota=nota.nota, observacion=nota.observacion)
    db.add(nueva)
    db.commit()
    db.refresh(nueva)
    return nueva

@app.get("/api/notas", response_model=List[schemas.Nota], tags=["Calificaciones"])
def listar_notas(db: Session = Depends(get_db)): return db.query(models.Nota).all()

@app.get("/api/notas/inscripcion/{id_inscripcion}", response_model=List[schemas.Nota], tags=["Calificaciones"])
def listar_notas_inscripcion(id_inscripcion: int, db: Session = Depends(get_db)): return db.query(models.Nota).filter(models.Nota.id_inscripcion == id_inscripcion).all()

@app.put("/api/notas/{id_nota}", response_model=schemas.Nota, tags=["Calificaciones"])
def actualizar_nota(id_nota: int, datos: schemas.NotaCreate, db: Session = Depends(get_db)):
    nota_db = db.query(models.Nota).filter(models.Nota.id_nota == id_nota).first()
    if not nota_db: raise HTTPException(status_code=404, detail="Nota no encontrada")
    if datos.nota is not None:
        if datos.nota < 0 or datos.nota > 100: raise HTTPException(status_code=400, detail="La nota debe estar entre 0 y 100")
        nota_db.nota = datos.nota
    if datos.observacion is not None: nota_db.observacion = datos.observacion
    db.commit()
    db.refresh(nota_db)
    return nota_db

@app.delete("/api/notas/{id_nota}", tags=["Calificaciones"])
def eliminar_nota(id_nota: int, db: Session = Depends(get_db)):
    nota = db.query(models.Nota).filter(models.Nota.id_nota == id_nota).first()
    if not nota: raise HTTPException(status_code=404, detail="Nota no encontrada")
    db.delete(nota)
    db.commit()
    return {"mensaje": "Nota eliminada"}