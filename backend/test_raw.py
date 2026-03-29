import socket

def test_raw_postgres_handshake(ip, port):
    print(f"Probando handshake inicial con {ip}:{port}...")
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(5)
        s.connect((ip, port))
        print("Conexión TCP establecida.")
        
        # Enviamos un paquete de solicitud de SSL (standard PG startup)
        # Length: 8 bytes, Value: 80877103 (SSL request)
        ssl_request = (8).to_bytes(4, byteorder='big') + (80877103).to_bytes(4, byteorder='big')
        s.sendall(ssl_request)
        
        response = s.recv(1)
        if response == b'S':
            print("El servidor soporta SSL.")
        elif response == b'N':
            print("El servidor NO soporta SSL.")
        else:
            print(f"Respuesta inesperada al SSL request: {response}")
            
        # Intentamos un startup packet básico (no-SSL)
        # Length: variable, Protocol: 3.0, Key values: user, postgres, database, postgres, etc
        user_bytes = b"user\x00postgres\x00database\x00postgres\x00\x00"
        length = 4 + 4 + len(user_bytes)
        startup_packet = length.to_bytes(4, byteorder='big') + (196608).to_bytes(4, byteorder='big') + user_bytes
        s.sendall(startup_packet)
        
        # Leemos la respuesta de autenticación
        # Típicamente 'R' followed by length and auth type
        auth_response = s.recv(1024)
        if auth_response:
            print(f"Respuesta de Auth (raw): {auth_response[:20]!r}")
            if auth_response.startswith(b'R'):
                auth_type = int.from_bytes(auth_response[5:9], byteorder='big')
                if auth_type == 0:
                    print("Auth OK!")
                elif auth_type == 3:
                    print("Requiere password (plaintext).")
                elif auth_type == 5:
                    print("Requiere password (md5).")
                elif auth_type == 10:
                    print("Requiere password (SCRAM-SHA-256).")
                else:
                    print(f"Tipo de Auth desconocido: {auth_type}")
            elif auth_response.startswith(b'E'):
                # Error Response
                print(f"ERROR DEL SERVIDOR: {auth_response[5:].decode('utf-8', 'ignore')}")
        else:
            print("No hubo respuesta del servidor después del startup packet.")
            
        s.close()
    except Exception as e:
        print(f"Fallo en el handshake: {e}")

if __name__ == "__main__":
    test_raw_postgres_handshake("170.51.29.84", 5432)
