from pydantic import BaseModel
from typing import Optional
from datetime import date, time

class Rol(BaseModel):
    id_rol: int
    nombre: str
    descripcion: Optional[str] = None
    class Config: from_attributes = True

class DocenteCreate(BaseModel):
    nombres: str
    apellidos: str
    ci: str
    correo: str
    password: str
    id_rol: int
    especialidad: str
    fechaIngreso: Optional[date] = None
    estado: bool = True
    direccion: Optional[str] = None
    telefonoEmergencia: Optional[str] = None
    fotoPerfil: Optional[str] = None

class Docente(DocenteCreate):
    id_usuario: int
    tipo_usuario: str
    class Config: from_attributes = True

class EstudianteCreate(BaseModel):
    nombres: str
    apellidos: str
    ci: str
    correo: str
    password: str
    id_rol: int
    codEstudiante: Optional[str] = None
    telefono: Optional[str] = None
    genero: Optional[str] = None
    fechaIngreso: Optional[date] = None
    estado: bool = True
    direccion: Optional[str] = None
    telefonoEmergencia: Optional[str] = None
    fotoPerfil: Optional[str] = None

class Estudiante(EstudianteCreate):
    id_usuario: int
    tipo_usuario: str
    class Config: from_attributes = True

class AdministrativoCreate(BaseModel):
    nombres: str
    apellidos: str
    ci: str
    correo: str
    password: str
    id_rol: int
    cargo: str
    departamento: Optional[str] = None
    fechaIngreso: Optional[date] = None
    estado: bool = True
    direccion: Optional[str] = None
    telefonoEmergencia: Optional[str] = None
    fotoPerfil: Optional[str] = None

class Administrativo(AdministrativoCreate):
    id_usuario: int
    tipo_usuario: str
    class Config: from_attributes = True

class Facultad(BaseModel):
    id_facultad: int
    nombre: str
    class Config: from_attributes = True

class Modalidad(BaseModel):
    id_modalidad: int
    nombre: str
    descripcion: Optional[str] = None
    class Config: from_attributes = True

class CarreraCreate(BaseModel):
    nombre: str
    codigo: str
    descripcion: Optional[str] = None
    id_facultad: int
    id_modalidad: int
    estado: bool = True

class Carrera(CarreraCreate):
    id_carrera: int
    class Config: from_attributes = True

class Periodo(BaseModel):
    id_periodo: int
    nombre: str
    class Config: from_attributes = True

class AulaCreate(BaseModel):
    nombre: str
    edificio: str
    capacidad: int
    tipo: str

class Aula(AulaCreate):
    id_aula: int
    class Config: from_attributes = True

class MateriaCreate(BaseModel):
    nombre: str
    codigo: str
    nivel: int
    id_carrera: int
    estado: bool = True

class Materia(MateriaCreate):
    id_materia: int
    class Config: from_attributes = True

class MatPrerequisitoCreate(BaseModel):
    id_materia: int
    id_prerequisito: int

class MatPrerequisito(MatPrerequisitoCreate):
    class Config: from_attributes = True

# ==========================================
# GRUPOS TOTALMENTE BLINDADOS
# ==========================================
class GrupoCreate(BaseModel):
    seccion: str
    cupoMax: int
    id_materia: int
    id_docente: int
    id_periodo: int
    turno: Optional[str] = None
    id_aula: Optional[int] = None
    horaInicio: Optional[time] = None
    horaFin: Optional[time] = None
    estado: bool = True

class Grupo(BaseModel):
    id_grupo: int
    seccion: Optional[str] = None
    cupoMax: Optional[int] = None
    cupoDisp: Optional[int] = None
    id_materia: Optional[int] = None
    id_docente: Optional[int] = None
    id_periodo: Optional[int] = None
    turno: Optional[str] = None
    id_aula: Optional[int] = None  # ¡AQUÍ ESTABA EL CRASHEO, AHORA PERMITE NULL!
    horaInicio: Optional[time] = None
    horaFin: Optional[time] = None
    estado: Optional[bool] = None
    class Config: from_attributes = True

# ==========================================

class EvaluacionCreate(BaseModel):
    id_grupo: int
    nombre: str
    fecha: date
    peso: float

class Evaluacion(EvaluacionCreate):
    id_evaluacion: int
    class Config: from_attributes = True

class InscripcionCreate(BaseModel):
    id_estudiante: int
    id_grupo: int
    fecha: date
    estado: str

class Inscripcion(InscripcionCreate):
    id_inscripcion: int
    class Config: from_attributes = True

class NotaCreate(BaseModel):
    id_inscripcion: int
    id_evaluacion: int
    nota: Optional[float] = None
    observacion: Optional[str] = None

class Nota(NotaCreate):
    id_nota: int
    class Config: from_attributes = True