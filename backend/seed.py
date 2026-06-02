import models
from database import SessionLocal, engine
from datetime import date
import hashlib

def obtener_password_hash(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()

models.Base.metadata.create_all(bind=engine)

def poblar_universidad():
    db = SessionLocal()
    print("Iniciando carga de datos...")

    try:
        roles = ["Administrador", "Docente", "Estudiante", "Administrativo"]
        for r in roles:
            if not db.query(models.Rol).filter(models.Rol.nombre == r).first():
                db.add(models.Rol(nombre=r, descripcion=f"Acceso de {r}"))
        db.commit()
        print(" [+] Roles OK")
    except Exception as e:
        db.rollback()
        print(f" [ERROR] Roles: {e}")

    try:
        modalidades = ["Semestral", "Anual", "Modular", "Virtual", "Intensivo de Verano"]
        for m in modalidades:
            if not db.query(models.Modalidad).filter(models.Modalidad.nombre == m).first():
                db.add(models.Modalidad(nombre=m, descripcion=f"Régimen {m}", estado=True))
        db.commit()
        print(" [+] Modalidades OK")
    except Exception as e:
        db.rollback()
        print(f" [ERROR] Modalidades: {e}")

    try:
        facultades = [
            ("Facultad de Ingeniería", "Sistemas, Redes, Civil, Industrial"),
            ("Facultad de Ciencias Empresariales", "Administración, Contaduría"),
            ("Facultad de Ciencias Jurídicas y Políticas", "Derecho y Relaciones Internacionales"),
            ("Facultad de Ciencias de la Salud", "Medicina, Odontología, Enfermería"),
            ("Facultad de Ciencias Sociales y Humanidades", "Psicología, Comunicación, Educación"),
            ("Facultad de Arquitectura, Diseño y Urbanismo", "Arquitectura y Diseño Gráfico")
        ]
        for fn, fd in facultades:
            if not db.query(models.Facultad).filter(models.Facultad.nombre == fn).first():
                db.add(models.Facultad(nombre=fn, descripcion=fd, estado=True))
        db.commit()
        print(" [+] Facultades OK")
    except Exception as e:
        db.rollback()
        print(f" [ERROR] Facultades: {e}")

    try:
        periodos = [
            ("Gestión I-2026", date(2026, 2, 1), date(2026, 7, 15)),
            ("Gestión II-2026", date(2026, 8, 1), date(2026, 12, 20))
        ]
        for pn, pi, pf in periodos:
            if not db.query(models.Periodo).filter(models.Periodo.nombre == pn).first():
                db.add(models.Periodo(nombre=pn, fechaInicio=pi, fechaFin=pf, activo=True))
        db.commit()
        print(" [+] Periodos OK")
    except Exception as e:
        db.rollback()
        print(f" [ERROR] Periodos: {e}")

    try:
        aulas = [
            ("Aula A-101", "Bloque A", 60, "Aula"),
            ("Lab Sistemas", "Tecnológico", 30, "Laboratorio")
        ]
        for an, ae, ac, at in aulas:
            if not db.query(models.Aula).filter(models.Aula.nombre == an).first():
                db.add(models.Aula(nombre=an, edificio=ae, capacidad=ac, tipo=at))
        db.commit()
        print(" [+] Aulas OK")
    except Exception as e:
        db.rollback()
        print(f" [ERROR] Aulas: {e}")

    try:
        tipos_eval = [
            ("Parcial 1", "Primera evaluación parcial", 25.0),
            ("Parcial 2", "Segunda evaluación parcial", 25.0),
            ("Examen Final", "Evaluación final", 30.0),
            ("Práctico", "Evaluación práctica", 20.0)
        ]
        for tn, td, tp in tipos_eval:
            if not db.query(models.TipoEval).filter(models.TipoEval.nombre == tn).first():
                db.add(models.TipoEval(nombre=tn, descripcion=td, pesoDefecto=tp))
        db.commit()
        print(" [+] Tipos de Evaluación OK")
    except Exception as e:
        db.rollback()
        print(f" [ERROR] Tipos Eval: {e}")

    try:
        admin_email = "admin@upds.edu.bo"
        admin_rol = db.query(models.Rol).filter(models.Rol.nombre == "Administrador").first()
        admin_existente = db.query(models.Usuario).filter(models.Usuario.correo == admin_email).first()

        if admin_rol:
            if admin_existente:
                admin_existente.password = obtener_password_hash("admin")
                admin_existente.nombres = "Administrador"
                admin_existente.apellidos = "Maestro"
                admin_existente.ci = "0000000"
                admin_existente.estado = True
                admin_existente.tipo_usuario = "admin"
                db.commit()
                print(f"\n [+] Admin ACTUALIZADO!")
            else:
                nuevo_admin = models.Usuario(
                    nombres="Administrador", apellidos="Maestro", ci="0000000",
                    correo=admin_email, password=obtener_password_hash("admin"),
                    id_rol=admin_rol.id_rol, estado=True, fechaCrea=date.today(),
                    tipo_usuario="admin"
                )
                db.add(nuevo_admin)
                db.commit()
                print(f"\n [+] Admin CREADO!")
            print(f"     Correo: {admin_email}")
            print(f"     Contraseña: admin")
    except Exception as e:
        db.rollback()
        print(f"\n [ERROR FATAL] Admin: {e}")

    print("\nProceso finalizado.")
    db.close()

if __name__ == "__main__":
    poblar_universidad()
