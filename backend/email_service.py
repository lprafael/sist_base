# email_service.py
# Servicio para envío de emails

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
import os
from dotenv import load_dotenv

load_dotenv()

class EmailService:
    def __init__(self):
        self.host = os.getenv("EMAIL_HOST", "smtp.gmail.com")
        self.port = int(os.getenv("EMAIL_PORT", "587"))
        self.username = os.getenv("EMAIL_USERNAME", "")
        self.password = os.getenv("EMAIL_PASSWORD", "")
        self.from_email = os.getenv("EMAIL_FROM", "")

    def send_email(self, to_email: str, subject: str, body: str, is_html: bool = False) -> bool:
        """Envía un email"""
        try:
            msg = MIMEMultipart()
            msg['From'] = self.from_email
            msg['To'] = to_email
            msg['Subject'] = subject

            if is_html:
                msg.attach(MIMEText(body, 'html'))
            else:
                msg.attach(MIMEText(body, 'plain'))

            server = smtplib.SMTP(self.host, self.port)
            server.starttls()
            server.login(self.username, self.password)
            text = msg.as_string()
            server.sendmail(self.from_email, to_email, text)
            server.quit()
            return True
        except Exception as e:
            print(f"Error enviando email: {e}")
            return False

    def send_welcome_email(self, to_email: str, username: str, password: str, role: str) -> bool:
        """Envía email de bienvenida con credenciales"""
        subject = "Bienvenido al Sistema"
        
        html_body = f"""
        <html>
        <body>
            <h2>Bienvenido al Sistema</h2>
            <p>Hola <strong>{username}</strong>,</p>
            <p>Tu cuenta ha sido creada exitosamente con los siguientes datos:</p>
            <ul>
                <li><strong>Usuario:</strong> {username}</li>
                <li><strong>Contraseña:</strong> {password}</li>
                <li><strong>Rol:</strong> {role}</li>
            </ul>
            <p>Por seguridad, te recomendamos cambiar tu contraseña después del primer inicio de sesión.</p>
            <p>Saludos,<br>Equipo de Desarrollo</p>
        </body>
        </html>
        """
        
        return self.send_email(to_email, subject, html_body, is_html=True)

    def send_password_reset_email(self, to_email: str, username: str, reset_token: str) -> bool:
        """Envía email para restablecer contraseña incluyendo el nombre de usuario de forma clara"""
        subject = "Recuperación de Contraseña y Usuario - Mi Cancha"
        frontend_url = os.getenv("FRONTEND_URL", "https://micancha.com.py")
        html_body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 24px; margin: 0;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 32px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                <div style="text-align: center; margin-bottom: 24px;">
                    <h2 style="color: #0f172a; margin: 0 0 6px 0; font-size: 22px;">Restablecimiento de Contraseña</h2>
                    <p style="color: #64748b; font-size: 14px; margin: 0;">Plataforma Oficial Mi Cancha</p>
                </div>
                
                <p style="color: #334155; font-size: 15px; line-height: 1.5;">Hola,</p>
                <p style="color: #334155; font-size: 15px; line-height: 1.5;">Has solicitado información para recuperar el acceso a tu cuenta. A continuación encontrarás tu identificador de usuario y el enlace para generar una nueva contraseña:</p>
                
                <!-- Tarjeta de Usuario -->
                <div style="background-color: #f1f5f9; border-left: 4px solid #3b82f6; padding: 18px 20px; border-radius: 8px; margin: 24px 0;">
                    <p style="margin: 0 0 8px 0; color: #475569; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">Tu Usuario Registrado</p>
                    <p style="margin: 0 0 6px 0; color: #0f172a; font-size: 16px;">
                        <strong>Nombre de usuario:</strong> <span style="font-family: monospace; font-size: 17px; font-weight: 700; color: #1d4ed8; background: #dbeafe; padding: 3px 10px; border-radius: 6px;">{username}</span>
                    </p>
                    <p style="margin: 0; color: #475569; font-size: 14px;">
                        <strong>Correo asociado:</strong> {to_email}
                    </p>
                    <p style="margin: 10px 0 0 0; color: #059669; font-size: 12px; font-weight: 600;">
                        💡 Nota: Al momento del ingreso puedes acceder usando indistintamente tu <strong>nombre de usuario</strong> o tu <strong>correo</strong>.
                    </p>
                </div>

                <!-- Botón de Restablecimiento -->
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{frontend_url}/reset-password?token={reset_token}" style="display: inline-block; padding: 14px 28px; background-color: #16a34a; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px; box-shadow: 0 2px 6px rgba(22, 163, 74, 0.3);">
                        🔑 Restablecer mi Contraseña
                    </a>
                </div>

                <p style="color: #64748b; font-size: 13px; line-height: 1.4;">
                    Si el botón anterior no funciona, copia y pega el siguiente enlace en tu navegador:<br>
                    <a href="{frontend_url}/reset-password?token={reset_token}" style="color: #2563eb; word-break: break-all; font-size: 12px;">{frontend_url}/reset-password?token={reset_token}</a>
                </p>
                
                <p style="color: #64748b; font-size: 13px;">O ingresa el token de seguridad manualmente: <strong style="font-family: monospace; color: #0f172a;">{reset_token}</strong></p>
                <p style="color: #94a3b8; font-size: 12px;">* Este enlace y token expiran en 1 hora por razones de seguridad. Si no solicitaste este cambio, puedes ignorar este correo.</p>
                
                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
                <p style="color: #94a3b8; font-size: 12px; margin: 0; text-align: center;">© Mi Cancha — Sistema de Gestión Deportiva</p>
            </div>
        </body>
        </html>
        """
        
        return self.send_email(to_email, subject, html_body, is_html=True)

    def send_admin_notification_email(self, admin_email: str, new_user_email: str, new_user_name: str) -> bool:
        """Notifica al administrador de una nueva solicitud de acceso"""
        subject = "Nueva Solicitud de Acceso - Sistema"
        
        html_body = f"""
        <html>
        <body>
            <h2>Nueva Solicitud de Acceso</h2>
            <p>Hola Administrador,</p>
            <p>Se ha registrado un nuevo usuario a través de Google y está pendiente de aprobación:</p>
            <ul>
                <li><strong>Nombre:</strong> {new_user_name}</li>
                <li><strong>Email:</strong> {new_user_email}</li>
            </ul>
            <p>Para activar este usuario, ingresa al panel de administración del sistema.</p>
            <p>Saludos,<br>Equipo de Desarrollo</p>
        </body>
        </html>
        """
        
        return self.send_email(admin_email, subject, html_body, is_html=True)

    def send_inscription_approved_email(
        self,
        to_email: str,
        equipo_nombre: str,
        torneo_nombre: str,
        username: str,
        token_jugadores: str,
        site_url: str = "https://micancha.com.py"
    ) -> bool:
        """Envía email de aprobación de inscripción al delegado del equipo"""
        subject = f"🏆 ¡Inscripción Aprobada! — {equipo_nombre} en {torneo_nombre}"
        enlace_login = f"{site_url}/login"
        enlace_jugadores = f"{site_url}/jugadores/{token_jugadores}" if token_jugadores else None

        link_jugadores_html = ""
        if enlace_jugadores:
            link_jugadores_html = f"""
            <tr>
              <td style="padding: 0 30px 20px;">
                <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:10px; padding:16px;">
                  <p style="margin:0 0 8px; font-weight:700; color:#15803d; font-size:14px;">📋 Enlace para inscribir jugadores</p>
                  <p style="margin:0 0 10px; color:#166534; font-size:13px;">Comparte este enlace con tus jugadores para que se inscriban:</p>
                  <a href="{enlace_jugadores}" style="display:inline-block; background:#16a34a; color:white; text-decoration:none; padding:10px 20px; border-radius:8px; font-weight:700; font-size:13px;">{enlace_jugadores}</a>
                </div>
              </td>
            </tr>"""

        html_body = f"""
        <html>
        <body style="margin:0; padding:0; background:#f8fafc; font-family:Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td align="center" style="padding: 40px 20px;">
                <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.08);">
                  
                  <!-- Header -->
                  <tr>
                    <td style="background:linear-gradient(135deg,#1e40af,#3b82f6); padding:32px 30px; text-align:center;">
                      <h1 style="margin:0; color:#ffffff; font-size:24px;">🏆 ¡Inscripción Aprobada!</h1>
                      <p style="margin:8px 0 0; color:#bfdbfe; font-size:15px;">{torneo_nombre}</p>
                    </td>
                  </tr>
                  
                  <!-- Body -->
                  <tr>
                    <td style="padding:30px 30px 10px;">
                      <p style="margin:0 0 16px; color:#1e293b; font-size:16px;">
                        ¡Felicitaciones! La inscripción del equipo <strong>{equipo_nombre}</strong> ha sido <span style="color:#16a34a; font-weight:700;">aprobada oficialmente</span> para el torneo <strong>{torneo_nombre}</strong>.
                      </p>
                      <p style="margin:0; color:#475569; font-size:14px;">
                        A partir de ahora puedes gestionar tu equipo, cargar logo, añadir jugadores y compartir el enlace de inscripción con tu plantel.
                      </p>
                    </td>
                  </tr>

                  <!-- Botón de acceso -->
                  <tr>
                    <td style="padding:20px 30px;">
                      <div style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:10px; padding:20px; text-align:center;">
                        <p style="margin:0 0 8px; font-weight:700; color:#1e40af; font-size:15px;">Acceso al Sistema</p>
                        <p style="margin:0 0 4px; color:#475569; font-size:13px;">Inicia sesión con tu usuario para gestionar el equipo:</p>
                        <p style="margin:0 0 16px; background:#dbeafe; display:inline-block; padding:6px 16px; border-radius:6px; font-weight:700; color:#1e40af; font-size:14px; letter-spacing:1px;">{username}</p><br>
                        <a href="{enlace_login}" style="display:inline-block; background:#1d4ed8; color:white; text-decoration:none; padding:14px 32px; border-radius:10px; font-weight:700; font-size:15px; letter-spacing:0.5px;">
                          👤 Iniciar Sesión
                        </a>
                        <p style="margin:12px 0 0; color:#64748b; font-size:11px;">{enlace_login}</p>
                      </div>
                    </td>
                  </tr>

                  <!-- Enlace jugadores -->
                  {link_jugadores_html}
                  
                  <!-- Footer -->
                  <tr>
                    <td style="padding:20px 30px 30px; border-top:1px solid #f1f5f9; text-align:center;">
                      <p style="margin:0; color:#94a3b8; font-size:12px;">
                        Este email fue enviado automáticamente por el sistema de torneos de MiCancha.<br>
                        © 2025 MiCancha. Todos los derechos reservados.
                      </p>
                    </td>
                  </tr>
                  
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
        """
        return self.send_email(to_email, subject, html_body, is_html=True)

    def send_delegado_link_email(
        self,
        to_email: str,
        equipo_nombre: str,
        torneo_nombre: str,
        enlace_delegado: str,
        enlace_jugadores: str,
        estado_inscripcion: str,
        costo_inscripcion: float
    ) -> bool:
        """Envía email al delegado con los enlaces para gestionar el equipo e inscribir jugadores"""
        subject = f"🔗 Enlaces de Gestión: {equipo_nombre} en {torneo_nombre}"
        
        mensaje_estado = ""
        if estado_inscripcion == "pendiente" and costo_inscripcion > 0:
            mensaje_estado = f"""
            <div style="background:#fffbeb; border:1px solid #fde68a; border-radius:10px; padding:16px; margin-bottom:20px;">
                <p style="margin:0; color:#b45309; font-size:14px; font-weight:700;">⚠️ Inscripción Pendiente de Pago</p>
                <p style="margin:8px 0 0; color:#92400e; font-size:13px;">
                    El torneo tiene un costo de inscripción de G. {costo_inscripcion:,.0f}. El organizador confirmará tu inscripción una vez verificado el pago.
                </p>
            </div>
            """
        elif estado_inscripcion == "confirmado":
            mensaje_estado = """
            <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:10px; padding:16px; margin-bottom:20px;">
                <p style="margin:0; color:#15803d; font-size:14px; font-weight:700;">✓ Inscripción Confirmada</p>
            </div>
            """

        html_body = f"""
        <html>
        <body style="margin:0; padding:0; background:#f8fafc; font-family:Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td align="center" style="padding: 40px 20px;">
                <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.08);">
                  
                  <!-- Header -->
                  <tr>
                    <td style="background:linear-gradient(135deg,#1e40af,#3b82f6); padding:32px 30px; text-align:center;">
                      <h1 style="margin:0; color:#ffffff; font-size:24px;">🔗 Enlaces de Inscripción</h1>
                      <p style="margin:8px 0 0; color:#bfdbfe; font-size:15px;">{torneo_nombre}</p>
                    </td>
                  </tr>
                  
                  <!-- Body -->
                  <tr>
                    <td style="padding:30px 30px 10px;">
                      <p style="margin:0 0 16px; color:#1e293b; font-size:16px;">
                        Has inscrito al equipo/academia <strong>{equipo_nombre}</strong> en <strong>{torneo_nombre}</strong>.
                      </p>
                      
                      {mensaje_estado}

                      <div style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:10px; padding:20px; text-align:left; margin-bottom: 20px;">
                        <p style="margin:0 0 8px; font-weight:700; color:#1e40af; font-size:15px;">1. Panel del Delegado</p>
                        <p style="margin:0 0 16px; color:#475569; font-size:13px;">Guarda este enlace para gestionar tu equipo, agregar jugadores manualmente o asignar categorías (no lo compartas):</p>
                        <a href="{enlace_delegado}" style="display:inline-block; background:#1d4ed8; color:white; text-decoration:none; padding:12px 24px; border-radius:8px; font-weight:700; font-size:14px; margin-bottom: 8px;">
                          Ir al Panel de Delegado
                        </a>
                        <p style="margin:0; color:#64748b; font-size:11px; word-break: break-all;">{enlace_delegado}</p>
                      </div>

                      <div style="background:#faf5ff; border:1px solid #e9d5ff; border-radius:10px; padding:20px; text-align:left;">
                        <p style="margin:0 0 8px; font-weight:700; color:#6b21a8; font-size:15px;">2. Enlace para Jugadores</p>
                        <p style="margin:0 0 16px; color:#475569; font-size:13px;">Comparte este enlace con tus atletas para que completen sus datos de inscripción:</p>
                        <a href="{enlace_jugadores}" style="display:inline-block; background:#7e22ce; color:white; text-decoration:none; padding:12px 24px; border-radius:8px; font-weight:700; font-size:14px; margin-bottom: 8px;">
                          Auto-Registro de Atletas
                        </a>
                        <p style="margin:0; color:#64748b; font-size:11px; word-break: break-all;">{enlace_jugadores}</p>
                      </div>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="padding:20px 30px 30px; border-top:1px solid #f1f5f9; text-align:center;">
                      <p style="margin:0; color:#94a3b8; font-size:12px;">
                        Este email fue enviado automáticamente por el sistema de torneos de MiCancha.<br>
                        © 2025 MiCancha. Todos los derechos reservados.
                      </p>
                    </td>
                  </tr>
                  
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
        """
        return self.send_email(to_email, subject, html_body, is_html=True)

    def send_organizador_academia_credentials(self, to_email: str, username: str, password: str, role: str, login_url: str) -> bool:
        """Envía email con credenciales de acceso para organizadores y academias"""
        subject = "🏆 Tus Credenciales de Acceso - Mi Cancha"
        role_display = "Organizador de Torneos" if role == "organizador" else "Academia / Escuela Deportiva"
        
        html_body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 24px; margin: 0;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 32px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                <div style="text-align: center; margin-bottom: 24px;">
                    <h2 style="color: #0f172a; margin: 0 0 6px 0; font-size: 22px;">¡Bienvenido a Mi Cancha!</h2>
                    <p style="color: #64748b; font-size: 14px; margin: 0;">Tu cuenta de <strong>{role_display}</strong> ha sido habilitada</p>
                </div>

                <p style="color: #334155; font-size: 15px; line-height: 1.5;">Hola,</p>
                <p style="color: #334155; font-size: 15px; line-height: 1.5;">Te damos la bienvenida al sistema de administración. A continuación te proporcionamos tus credenciales oficiales de acceso:</p>
                
                <!-- Tarjeta de Credenciales -->
                <div style="background-color: #f1f5f9; border-left: 4px solid #16a34a; padding: 20px; border-radius: 8px; margin: 24px 0;">
                    <p style="margin: 0 0 12px 0; color: #475569; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">Credenciales Asignadas</p>
                    
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 6px 0; color: #475569; font-size: 14px; width: 140px;"><strong>Nombre de usuario:</strong></td>
                            <td style="padding: 6px 0; font-family: monospace; font-size: 16px; font-weight: 700; color: #1e40af;"><span style="background: #dbeafe; padding: 2px 8px; border-radius: 4px;">{username}</span></td>
                        </tr>
                        <tr>
                            <td style="padding: 6px 0; color: #475569; font-size: 14px;"><strong>Correo electrónico:</strong></td>
                            <td style="padding: 6px 0; font-size: 15px; color: #0f172a; font-weight: 600;">{to_email}</td>
                        </tr>
                        <tr>
                            <td style="padding: 6px 0; color: #475569; font-size: 14px;"><strong>Contraseña:</strong></td>
                            <td style="padding: 6px 0; font-family: monospace; font-size: 16px; font-weight: 700; color: #0f172a;"><span style="background: #e2e8f0; padding: 2px 8px; border-radius: 4px;">{password}</span></td>
                        </tr>
                    </table>

                    <p style="margin: 14px 0 0 0; color: #059669; font-size: 12px; font-weight: 600;">
                        💡 Puedes ingresar indistintamente con tu <strong>nombre de usuario</strong> o tu <strong>correo electrónico</strong>.
                    </p>
                </div>

                <!-- Botón de Acceso -->
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{login_url}" style="display: inline-block; padding: 14px 32px; background-color: #16a34a; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px; box-shadow: 0 2px 6px rgba(22, 163, 74, 0.3);">
                        🚀 Ingresar al Sistema
                    </a>
                </div>

                <p style="color: #64748b; font-size: 13px; line-height: 1.4;">
                    Enlace de acceso directo:<br>
                    <a href="{login_url}" style="color: #2563eb; font-size: 12px;">{login_url}</a>
                </p>

                <p style="color: #475569; font-size: 13px;">Por seguridad, te sugerimos cambiar tu contraseña al ingresar por primera vez.</p>
                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
                <p style="color: #94a3b8; font-size: 12px; margin: 0; text-align: center;">© Mi Cancha — Sistema de Gestión Deportiva</p>
            </div>
        </body>
        </html>
        """
        
        return self.send_email(to_email, subject, html_body, is_html=True)

# Instancia global del servicio de email
email_service = EmailService()