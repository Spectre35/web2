# Configuración para UptimeRobot (Servicio gratuito de monitoreo)

## URLs para monitorear:

### Backend (API):
https://buscadores.onrender.com/health-check

### Frontend (Aplicación):
https://cargosfraudes.onrender.com

## Configuración recomendada:
- Intervalo: 5 minutos
- Timeout: 30 segundos
- Tipo: HTTP/HTTPS
- Método: GET

## Servicios gratuitos de ping:
1. **UptimeRobot** (https://uptimerobot.com) - 50 monitores gratis
2. **Freshping** (https://freshping.io) - 50 checks gratis
3. **Pingdom** (https://pingdom.com) - 1 check gratis
4. **StatusCake** (https://statuscake.com) - Checks limitados gratis

## Configuración manual:
1. Regístrate en UptimeRobot
2. Crea un nuevo monitor HTTP(s)
3. URL: https://buscadores.onrender.com/health-check
4. Intervalo: 5 minutos
5. Repite para el frontend

Esto mantendrá ambos servicios activos 24/7.
