import subprocess

ssh_target = "root@187.77.247.23"
remote_cmd = (
    "docker exec -e PGPASSWORD=MiCanchaSegura_2026_Postgres micancha-db-local psql -U postgres -d BBDD_micancha "
    "-c \""
    "SELECT t.nombre || ' ' || t.apellido AS tutor, "
    "       df.receptor_ruc || '-' || df.receptor_dv AS ruc, "
    "       string_agg(a.nombre || ' ' || a.apellido, ', ') AS alumnos_vinculados, "
    "       count(a.id) AS total_alumnos "
    "FROM academias.tutores t "
    "JOIN academias.alumno_tutores at ON at.tutor_id = t.id "
    "JOIN academias.alumnos a ON a.id = at.alumno_id "
    "LEFT JOIN facturacion.datos_facturacion df ON df.tutor_id = t.id "
    "WHERE t.academia_id = 'dc81e3c8-0edc-4309-afce-41f708166496' "
    "GROUP BY t.id, t.nombre, t.apellido, df.receptor_ruc, df.receptor_dv "
    "HAVING count(a.id) > 1;\""
)

res = subprocess.run(["ssh", "-o", "StrictHostKeyChecking=no", ssh_target, remote_cmd], capture_output=True, text=True)
print("=== TUTORES CON MÚLTIPLES ATLETAS VINCULADOS ===")
print(res.stdout)
