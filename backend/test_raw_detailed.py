import socket

def test_raw_postgres_handshake(ip, port):
    with open("error_postgres.txt", "w", encoding="utf-8") as file:
        file.write(f"Probando handshake con {ip}:{port}...\n")
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.settimeout(10)
            s.connect((ip, port))
            file.write("TCP conectado.\n")
            
            # Startup packet for user 'postgres' and database 'BBDD_playa'
            user_bytes = b"user\x00postgres\x00database\x00BBDD_playa\x00\x00"
            length = 8 + len(user_bytes)
            startup_packet = length.to_bytes(4, byteorder='big') + (196608).to_bytes(4, byteorder='big') + user_bytes
            s.sendall(startup_packet)
            
            response = s.recv(4096)
            if response:
                file.write(f"Respuesta del servidor: {response!r}\n")
                if response.startswith(b'E'):
                    # The message starts after E <length>
                    # We can try decoding the whole thing to see the content.
                    # Error messages in Postgres have fields (S=Severity, M=Message, etc) separated by \x00
                    fields = response[5:].split(b'\x00')
                    for field in fields:
                        if field:
                            msg = field.decode('utf-8', 'ignore')
                            file.write(f"  --> {msg}\n")
            else:
                file.write("Sin respuesta del servidor.\n")
            s.close()
        except Exception as e:
            file.write(f"Error: {e}\n")

if __name__ == "__main__":
    test_raw_postgres_handshake("170.51.29.84", 5432)
