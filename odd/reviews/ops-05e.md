# Review gate OPS-05e: checkout del commit de la rama

---
tarea: OPS-05e
base: 885c53c
revisado: f6411d4
revisor: jd-judge-b (contexto limpio, solo lectura)
veredicto: aprobado
---

## Resumen

El ref es el correcto: `github.event.pull_request.head.sha` existe en todos los tipos de evento que disparan el job (`opened`, `synchronize`, `reopened`, `edited` y `ready_for_review`) y es la referencia canónica de "lo que hay en la rama". En pull requests desde un fork, `actions/checkout` puede resolver ese commit, y como el job solo lee archivos con un token de lectura no hay riesgo nuevo. El cambio no debilita el gate: `check` y `e2e` siguen usando el checkout por defecto, así que la integración sigue cubierta, y el único caso límite es que una rama base renombrara o borrara `odd/reviews/`, algo que el merge humano cubre. La documentación es coherente con el cambio y elimina el apaño de "editá el PR". `REF-OPS-05e` está correctamente marcado como hecho. Sin dependencias del merge ref en el resto del repositorio: solo quedan menciones históricas en los informes de OPS-05d, que es correcto conservar. YAML válido, sin dependencias nuevas, español, sin rayas.

## Hallazgos

### 1. [nota] odd/tasks/ops-05e-checkout-head.md:36

Problema: la sección de evidencia quedaba pendiente; la verificación prometida solo se demuestra en el PR vivo.
Propuesta: anotar la evidencia al cerrar. Aplicado: queda registrado que al marcar listo el job se ejecutó a la primera y pasó.

### 2. [nota] .github/workflows/check.yml:62

Problema: el comentario atribuía el problema solo al run de `ready_for_review`, y también afectaba a `edited` y a un `synchronize` justo después de un rebase.
Propuesta: matizarlo. Aplicado.

## Secretos

Ninguno. El único valor interpolado es el sha del commit de la rama; la clave de IA no aparece en ningún workflow.

## Qué se aplicó en la ronda de correcciones

Las dos notas. No hubo bloqueantes ni recomendados, así que no hubo corrección de código.
