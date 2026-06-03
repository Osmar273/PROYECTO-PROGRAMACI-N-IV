from sqlalchemy import Column, Integer, String, Boolean, Date, ForeignKey, Float, Time
from sqlalchemy.orm import relationship
from database import Base

class Rol(Base):
    __tablename__ = "rol"
    id_rol = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, unique=True, index=True)
    descripcion = Column(String, nullable=True)

class Usuario(Base):
    __tablename__ = "usuario"
    id_usuario = Column(Integer, primary_key=True, index=True)
    nombres = Column(String)
    apellidos = Column(String)
    ci = Column(String, unique=True, nullable=True)
    correo = Column(String, unique=True, index=True)
    password = Column(String)
    estado = Column(Boolean, default=True)
    fechaCrea = Column(Date)
    id_rol = Column(Integer, ForeignKey("rol.id_rol"))
    tipo_usuario = Column(String)
    direccion = Column(String, nullable=True)
    telefonoEmergencia = Column(String, nullable=True)
    fotoPerfil = Column(String, nullable=True)
    __mapper_args__ = {"polymorphic_identity": "admin", "polymorphic_on": tipo_usuario}

class Docente(Usuario):
    __tablename__ = "docente"
    id_usuario = Column(Integer, ForeignKey("usuario.id_usuario"), primary_key=True)
    especialidad = Column(String)
    fechaIngreso = Column(Date, nullable=True)
    __mapper_args__ = {"polymorphic_identity": "docente"}

class Estudiante(Usuario):
    __tablename__ = "estudiante"
    id_usuario = Column(Integer, ForeignKey("usuario.id_usuario"), primary_key=True)
    codEstudiante = Column(String, unique=True, nullable=True)
    telefono = Column(String, nullable=True)
    genero = Column(String, nullable=True)
    fechaIngreso = Column(Date, nullable=True)
    __mapper_args__ = {"polymorphic_identity": "estudiante"}

class Administrativo(Usuario):
    __tablename__ = "administrativo"
    id_usuario = Column(Integer, ForeignKey("usuario.id_usuario"), primary_key=True)
    cargo = Column(String)
    departamento = Column(String, nullable=True)
    fechaIngreso = Column(Date, nullable=True)
    __mapper_args__ = {"polymorphic_identity": "administrativo"}

class Modalidad(Base):
    __tablename__ = "modalidad"
    id_modalidad = Column(Integer, primary_key=True, index=True)
    nombre = Column(String)
    descripcion = Column(String, nullable=True)
    estado = Column(Boolean, default=True)

class Facultad(Base):
    __tablename__ = "facultad"
    id_facultad = Column(Integer, primary_key=True, index=True)
    nombre = Column(String)
    descripcion = Column(String, nullable=True)
    estado = Column(Boolean, default=True)

class Carrera(Base):
    __tablename__ = "carrera"
    id_carrera = Column(Integer, primary_key=True, index=True)
    nombre = Column(String)
    codigo = Column(String, unique=True)
    descripcion = Column(String, nullable=True)
    estado = Column(Boolean, default=True)
    id_facultad = Column(Integer, ForeignKey("facultad.id_facultad"))
    id_modalidad = Column(Integer, ForeignKey("modalidad.id_modalidad"))

class Periodo(Base):
    __tablename__ = "periodo"
    id_periodo = Column(Integer, primary_key=True, index=True)
    nombre = Column(String)
    fechaInicio = Column(Date)
    fechaFin = Column(Date)
    activo = Column(Boolean, default=True)

class Aula(Base):
    __tablename__ = "aula"
    id_aula = Column(Integer, primary_key=True, index=True)
    nombre = Column(String)
    edificio = Column(String)
    capacidad = Column(Integer)
    tipo = Column(String)

class Materia(Base):
    __tablename__ = "materia"
    id_materia = Column(Integer, primary_key=True, index=True)
    nombre = Column(String)
    codigo = Column(String, unique=True)
    nivel = Column(Integer)
    estado = Column(Boolean, default=True)
    id_carrera = Column(Integer, ForeignKey("carrera.id_carrera"))

class MatPrerequisito(Base):
    __tablename__ = "matprerequisito"
    id_materia = Column(Integer, ForeignKey("materia.id_materia"), primary_key=True)
    id_prerequisito = Column(Integer, ForeignKey("materia.id_materia"), primary_key=True)

class Grupo(Base):
    __tablename__ = "grupo"
    id_grupo = Column(Integer, primary_key=True, index=True)
    seccion = Column(String)
    cupoMax = Column(Integer)
    cupoDisp = Column(Integer)
    estado = Column(Boolean, default=True)
    id_materia = Column(Integer, ForeignKey("materia.id_materia"))
    id_docente = Column(Integer, ForeignKey("usuario.id_usuario"))
    id_periodo = Column(Integer, ForeignKey("periodo.id_periodo"))
    
    # NUEVOS CAMPOS INTEGRADOS
    turno = Column(String, nullable=True)
    id_aula = Column(Integer, ForeignKey("aula.id_aula"), nullable=True)
    horaInicio = Column(Time, nullable=True)
    horaFin = Column(Time, nullable=True)

class Evaluacion(Base):
    __tablename__ = "evaluacion"
    id_evaluacion = Column(Integer, primary_key=True, index=True)
    id_grupo = Column(Integer, ForeignKey("grupo.id_grupo"))
    nombre = Column(String)
    fecha = Column(Date)
    peso = Column(Float)

class Inscripcion(Base):
    __tablename__ = "inscripcion"
    id_inscripcion = Column(Integer, primary_key=True, index=True)
    id_estudiante = Column(Integer, ForeignKey("usuario.id_usuario"))
    id_grupo = Column(Integer, ForeignKey("grupo.id_grupo"))
    fecha = Column(Date)
    estado = Column(String)

class Nota(Base):
    __tablename__ = "nota"

    id_nota = Column(Integer, primary_key=True, index=True)

    id_inscripcion = Column(
        Integer,
        ForeignKey("inscripcion.id_inscripcion")
    )

    id_evaluacion = Column(
        Integer,
        ForeignKey("evaluacion.id_evaluacion")
    )

    nota = Column(Float, nullable=True)

    observacion = Column(String, nullable=True)