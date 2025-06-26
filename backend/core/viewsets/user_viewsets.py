from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from core.models.sections.user_profile import UserProfile
from core.serializers.user_serializers import UserProfileSerializer
from core.utils.auth0 import get_token_auth_header, verify_jwt, update_user_app_metadata
from rest_framework.decorators import action
import jwt
from django.conf import settings
import requests
from django.utils import timezone
from datetime import timedelta


def get_email_from_token(token, payload):
    email = payload.get("email")
    if not email:
        sub = payload.get("sub")
        if sub:
            try:
                userinfo_url = f"https://{settings.AUTH0_DOMAIN}/userinfo"
                headers = {"Authorization": f"Bearer {token}"}
                userinfo_response = requests.get(userinfo_url, headers=headers)
                if userinfo_response.status_code == 200:
                    userinfo_data = userinfo_response.json()
                    email = userinfo_data.get("email")
            except Exception as userinfo_error:
                print(f"=== DEBUG: Error obteniendo userinfo: {userinfo_error} ===")
    return email


@api_view(['POST'])
@permission_classes([AllowAny])
def auth0_login_view(request):
    """
    Vista para manejar el login de Auth0.
    Recibe un token JWT, lo verifica y crea/recupera el perfil del usuario.
    """
    try:
        token = get_token_auth_header(request)
        payload = verify_jwt(token)
        email = payload.get("email")
        # Priorizar el nombre recibido en el body, luego buscar en el token, luego el email
        name = (
            request.data.get("name") or
            payload.get("name") or
            payload.get("nickname") or
            payload.get("given_name") or
            payload.get("email")
        )
        
        app_metadata = payload.get("https://yourapp.com/app_metadata", {})
        vertical_id = app_metadata.get("vertical_id")
        if not email:
            return Response({"error": "Email not found in token"}, status=400)
        # Si no hay vertical_id en el token, usar un valor por defecto o requerirlo
        if not vertical_id:
            return Response({"error": "Vertical ID not found in token"}, status=400)
        # Crear o recuperar el perfil del usuario
        user, created = UserProfile.objects.get_or_create(
            email=email,
            defaults={
                "vertical": vertical_id,
                "name": name
            }
        )
        # Si ya existía y el nombre o vertical cambió, actualízalos
        if not created:
            updated = False
            if user.vertical != vertical_id:
                user.vertical = vertical_id
                updated = True
            if user.name != name:
                user.name = name
                updated = True
            if updated:
                user.save()
        # Si el usuario ya existía pero el vertical cambió, actualizarlo
        if not created and user.vertical != vertical_id:
            user.vertical = vertical_id
            user.save()
        serializer = UserProfileSerializer(user)
        return Response(serializer.data, status=200)
    except Exception as e:
        return Response({"error": str(e)}, status=401)


class UserProfileViewSet(viewsets.ModelViewSet):
    queryset = UserProfile.objects.all()
    serializer_class = UserProfileSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = super().get_queryset()
        email = self.request.query_params.get('email', None)
        if email:
            queryset = queryset.filter(email=email)
        return queryset

    @action(detail=False, methods=["post"], url_path="register-attempt")
    def register_attempt(self, request):
        try:
            token = get_token_auth_header(request)
            payload = verify_jwt(token)
            email = get_email_from_token(token, payload)

            if not email:
                return Response({"error": "Email not found in token"}, status=400)

            user = UserProfile.objects.get(email=email)

            if not user.puede_intentar_test():
                desbloqueo = user.fecha_bloqueo + timedelta(days=5)
                return Response({
                    "error": "Has alcanzado el máximo de intentos. Podrás volver a intentarlo el:",
                    "fecha_desbloqueo": desbloqueo.date().isoformat()
                }, status=403)

            # Incrementar intento
            user.intentos_realizados += 1

            # Bloquear si ya llegó al intento 3
            if user.intentos_realizados == 3:
                user.fecha_bloqueo = timezone.now()

            user.save()

            return Response({
                "message": "Intento registrado correctamente.",
                "intentos_realizados": user.intentos_realizados,
                "bloqueado": user.intentos_realizados >= 3
            }, status=200)

        except UserProfile.DoesNotExist:
            return Response({"error": "User not found"}, status=404)
        except Exception as e:
            return Response({"error": str(e)}, status=500)

    @action(detail=False, methods=["get"], url_path="me")
    def me(self, request):
        try:
            print("=== DEBUG: Iniciando método me ===")
            
            # Verificar configuración de Auth0
            print(f"=== DEBUG: AUTH0_DOMAIN: {getattr(settings, 'AUTH0_DOMAIN', 'NO CONFIGURADO')} ===")
            print(f"=== DEBUG: AUTH0_AUDIENCE: {getattr(settings, 'AUTH0_AUDIENCE', 'NO CONFIGURADO')} ===")
            
            if not hasattr(settings, 'AUTH0_DOMAIN') or not settings.AUTH0_DOMAIN:
                return Response({"error": "Auth0 domain not configured"}, status=500)
            
            if not hasattr(settings, 'AUTH0_AUDIENCE') or not settings.AUTH0_AUDIENCE:
                return Response({"error": "Auth0 audience not configured"}, status=500)
            
            token = get_token_auth_header(request)
            print(f"=== DEBUG: Token extraído: {token[:50]}... ===")
            
            # Decodificar token sin verificación para debug
            try:
                # Decodificar sin verificar para ver el contenido
                unverified_payload = jwt.decode(token, options={"verify_signature": False})
                print(f"=== DEBUG: Payload sin verificar: {unverified_payload} ===")
                
                # Verificación normal del token
                payload = verify_jwt(token)
                print(f"=== DEBUG: Payload verificado: {payload} ===")
            except Exception as verify_error:
                print(f"=== DEBUG: Error en verificación: {verify_error} ===")
                # Usar payload sin verificar temporalmente
                payload = unverified_payload

            email = payload.get("email")
            print(f"=== DEBUG: Email extraído: {email} ===")
            
            # Si no hay email en el payload principal, obtenerlo del endpoint userinfo
            if not email:
                sub = payload.get("sub")
                print(f"=== DEBUG: Sub extraído: {sub} ===")
                if sub:
                    try:
                        # Obtener email del endpoint userinfo de Auth0
                        userinfo_url = f"https://{settings.AUTH0_DOMAIN}/userinfo"
                        headers = {"Authorization": f"Bearer {token}"}
                        userinfo_response = requests.get(userinfo_url, headers=headers)
                        print(f"=== DEBUG: Userinfo response status: {userinfo_response.status_code} ===")
                        
                        if userinfo_response.status_code == 200:
                            userinfo_data = userinfo_response.json()
                            print(f"=== DEBUG: Userinfo data: {userinfo_data} ===")
                            email = userinfo_data.get("email")
                            print(f"=== DEBUG: Email obtenido de userinfo: {email} ===")
                        else:
                            print(f"=== DEBUG: Error en userinfo: {userinfo_response.text} ===")
                    except Exception as userinfo_error:
                        print(f"=== DEBUG: Error obteniendo userinfo: {userinfo_error} ===")
            
            if not email:
                print("=== DEBUG: Email no encontrado en token ni userinfo ===")
                return Response({"error": "Email not found in token"}, status=400)

            # Buscar si el usuario ya existe
            try:
                user = UserProfile.objects.get(email=email)
                print(f"=== DEBUG: Usuario encontrado: {user.email} ===")
                return Response({
                    "email": user.email,
                    "vertical_id": user.vertical,
                    "exists": True
                })
            except UserProfile.DoesNotExist:
                print(f"=== DEBUG: Usuario no existe, creando respuesta para email: {email} ===")
                # Si no existe, solo devolver el email para que el frontend muestre el modal
                return Response({
                    "email": email,
                    "vertical_id": None,
                    "exists": False
                })

        except Exception as e:
            print(f"=== DEBUG: Error en método me: {str(e)} ===")
            import traceback
            print(f"=== DEBUG: Traceback: {traceback.format_exc()} ===")
            return Response({"error": str(e)}, status=401)

    @action(detail=False, methods=["post"], url_path="create-or-update")
    def create_or_update(self, request):
        try:
            print("=== DEBUG: Iniciando método create_or_update ===")
            token = get_token_auth_header(request)
            payload = verify_jwt(token)
            email = get_email_from_token(token, payload)
            if not email:
                return Response({"error": "Email not found in token"}, status=400)
            
            print(f"=== DEBUG: Email obtenido: {email} ===")
            
            # Buscar si el usuario ya existe
            try:
                user = UserProfile.objects.get(email=email)
                print(f"=== DEBUG: Usuario encontrado: {user.email} ===")
                return Response({"email": user.email}, status=200)
            except UserProfile.DoesNotExist:
                print(f"=== DEBUG: Usuario no existe, no se puede crear sin vertical ===")
                # No crear usuario sin vertical ya que el campo no permite nulos
                return Response({"error": "User not found. Please set vertical first."}, status=404)
        except Exception as e:
            print(f"=== DEBUG: Error en create_or_update: {str(e)} ===")
            return Response({"error": str(e)}, status=401)

    @action(detail=False, methods=["post"], url_path="create-with-vertical")
    def create_with_vertical(self, request):
        try:
            print("=== DEBUG: Iniciando método create_with_vertical ===")
            token = get_token_auth_header(request)
            payload = verify_jwt(token)
            email = get_email_from_token(token, payload)
            # Priorizar el nombre recibido en el body, luego buscar en el token, luego el email
            name = (
                request.data.get("name") or
                payload.get("name") or
                payload.get("nickname") or
                payload.get("given_name") or
                payload.get("email")
            )
            vertical_id = request.data.get("vertical_id")
            print(f"=== DEBUG: Email obtenido: {email} ===")
            print(f"=== DEBUG: Nombre obtenido: {name} ===")
            print(f"=== DEBUG: Vertical ID recibido: {vertical_id} ===")
            print(f"=== DEBUG: Request data: {request.data} ===")
            if not email:
                print("=== DEBUG: Email no encontrado ===")
                return Response({"error": "Email not found in token"}, status=400)
            if not vertical_id:
                print("=== DEBUG: Vertical ID no proporcionado ===")
                return Response({"error": "Vertical ID is required"}, status=400)
            # Crear o recuperar usuario
            user, created = UserProfile.objects.get_or_create(
                email=email,
                defaults={
                    "vertical": vertical_id,
                    "name": name
                }
            )
            updated = False
            if not created:
                if user.vertical != vertical_id:
                    user.vertical = vertical_id
                    updated = True
                if user.name != name:
                    user.name = name
                    updated = True
                if updated:
                    user.save()
                    print("=== DEBUG: Usuario actualizado con nuevo vertical o nombre ===")
            else:
                print(f"=== DEBUG: Usuario creado: {user.email} ===")
            return Response({
                "email": user.email, 
                "name": user.name,
                "vertical": user.vertical,
                "created": created
            }, status=201 if created else 200)
        except Exception as e:
            print(f"=== DEBUG: Error en create_with_vertical: {str(e)} ===")
            import traceback
            print(f"=== DEBUG: Traceback: {traceback.format_exc()} ===")
            return Response({"error": str(e)}, status=401)
    
    @action(detail=False, methods=["patch"], url_path="set-vertical")
    def set_vertical(self, request):
        try:
            print("=== DEBUG: Iniciando método set_vertical ===")
            token = get_token_auth_header(request)
            payload = verify_jwt(token)
            email = get_email_from_token(token, payload)
            vertical_id = request.data.get("vertical_id")
            
            print(f"=== DEBUG: Email obtenido: {email} ===")
            print(f"=== DEBUG: Vertical ID recibido: {vertical_id} ===")
            print(f"=== DEBUG: Request data: {request.data} ===")
            
            if not email:
                print("=== DEBUG: Email no encontrado ===")
                return Response({"error": "Email not found in token"}, status=400)
            if not vertical_id:
                print("=== DEBUG: Vertical ID no proporcionado ===")
                return Response({"error": "Vertical ID is required"}, status=400)
            
            user = UserProfile.objects.get(email=email)
            print(f"=== DEBUG: Usuario encontrado: {user.email} ===")
            user.vertical = vertical_id
            user.save()
            print(f"=== DEBUG: Vertical actualizado a: {user.vertical} ===")
            return Response({"email": user.email, "vertical": user.vertical}, status=200)
        except UserProfile.DoesNotExist:
            print(f"=== DEBUG: Usuario no encontrado para email: {email} ===")
            return Response({"error": "User not found"}, status=404)
        except Exception as e:
            print(f"=== DEBUG: Error en set_vertical: {str(e)} ===")
            import traceback
            print(f"=== DEBUG: Traceback: {traceback.format_exc()} ===")
            return Response({"error": str(e)}, status=401)

    @action(detail=False, methods=["post"], url_path="update-test-results")
    def update_test_results(self, request):
        try:
            print("=== DEBUG: Iniciando método update_test_results ===")
            token = get_token_auth_header(request)
            payload = verify_jwt(token)
            email = get_email_from_token(token, payload)
            
            # Obtener datos del request
            test_results = request.data.get("test_results", {})
            nivel = request.data.get("nivel")
            
            print(f"=== DEBUG: Email obtenido: {email} ===")
            print(f"=== DEBUG: Test results: {test_results} ===")
            print(f"=== DEBUG: Nivel: {nivel} ===")
            
            if not email:
                return Response({"error": "Email not found in token"}, status=400)
            
            # Buscar el usuario
            try:
                user = UserProfile.objects.get(email=email)
                print(f"=== DEBUG: Usuario encontrado: {user.email} ===")
                
                # Actualizar los resultados del test en la base de datos
                if test_results.get("listening") is not None:
                    user.resultado_listening = test_results["listening"]
                if test_results.get("speaking") is not None:
                    user.resultado_speaking = test_results["speaking"]
                if test_results.get("reading") is not None:
                    user.resultado_reading = test_results["reading"]
                if test_results.get("writing") is not None:
                    user.resultado_writing = test_results["writing"]
                
                # El resultado general y nivel se calculan automáticamente en el modelo
                user.save()
                
                print(f"=== DEBUG: Resultados actualizados en BD ===")
                print(f"=== DEBUG: Resultado general: {user.resultado_general} ===")
                print(f"=== DEBUG: Nivel calculado: {user.nivel} ===")
                
                # Obtener el user_id de Auth0 del token
                user_id = payload.get("sub")
                if not user_id:
                    return Response({"error": "User ID not found in token"}, status=400)
                
                # Solo actualizar app_metadata si todos los resultados están presentes
                resultados_completos = all([
                    user.resultado_listening is not None,
                    user.resultado_speaking is not None,
                    user.resultado_reading is not None,
                    user.resultado_writing is not None
                ])
                
                auth0_updated = False
                if resultados_completos:
                    app_metadata = {
                        "english_level": user.nivel
                    }
                    try:
                        update_user_app_metadata(user_id, app_metadata)
                        print(f"=== DEBUG: App metadata actualizado en Auth0 ===")
                        auth0_updated = True
                    except Exception as auth0_error:
                        print(f"=== DEBUG: Error actualizando Auth0: {str(auth0_error)} ===")
                        # Continuar aunque falle Auth0, los datos están en BD
                else:
                    print("=== DEBUG: No se actualiza Auth0 porque faltan resultados ===")
                
                return Response({
                    "email": user.email,
                    "vertical": user.vertical,
                    "test_results": {
                        "listening": user.resultado_listening,
                        "speaking": user.resultado_speaking,
                        "reading": user.resultado_reading,
                        "writing": user.resultado_writing,
                        "general": user.resultado_general
                    },
                    "nivel": user.nivel,
                    "auth0_updated": auth0_updated
                }, status=200)
                
            except UserProfile.DoesNotExist:
                print(f"=== DEBUG: Usuario no existe: {email} ===")
                return Response({"error": "User not found"}, status=404)
                
        except Exception as e:
            print(f"=== DEBUG: Error en update_test_results: {str(e)} ===")
            import traceback
            print(f"=== DEBUG: Traceback: {traceback.format_exc()} ===")
            return Response({"error": str(e)}, status=401)