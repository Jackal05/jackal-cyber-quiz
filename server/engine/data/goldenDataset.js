/**
 * Curated Golden Dataset of Exemplary Cybersecurity Questions
 * Meets all strict criteria:
 * - High cognitive Bloom level (Analyze, Apply, Evaluate)
 * - Domain-homogeneous, plausible distractors
 * - RFC 5737 / RFC 2606 safe IPs & domains
 * - MITRE ATT&CK & CVE alignment
 * - Comprehensive technical explanations
 */

export const GOLDEN_QUESTIONS = [
  {
    id: "gold_ad_kerberoast_01",
    domain: "Security Operations & Defense",
    category: "Identity & Access Management",
    subcategory: "Active Directory Security",
    concept_id: "ad_kerberoast_mitigation",
    cognitive_level: "Analyze",
    difficulty: "hard",
    prompt:
      "Durante una auditoría en un entorno de Active Directory corporativo (corp.local), el equipo SOC detecta múltiples solicitudes TGS-REQ (Event ID 4769) con cifrado RC4 (0x17) dirigidas a cuentas de servicio con ServicePrincipalNames (SPN) registrados. ¿Cuál es la medida de mitigación más efectiva a largo plazo contra este vector de Kerberoasting?",
    options: [
      {
        text: "Migrar las cuentas de servicio a Managed Service Accounts (gMSA) con contraseñas de 128 caracteres y forzar cifrado AES-256.",
        is_correct: true,
        rationale: "gMSA rota automáticamente contraseñas criptográficamente complejas y el uso de AES-256 hace inviable el cracking offline de los tickets TGS.",
      },
      {
        text: "Deshabilitar la pre-autenticación Kerberos (Do not require Kerberos preauthentication) en las cuentas de servicio afectadas.",
        is_correct: false,
        rationale: "Deshabilitar la pre-autenticación abre la puerta a AS-REP Roasting, empeorando la postura de seguridad.",
      },
      {
        text: "Habilitar Protected Users Security Group para todas las cuentas de servicio con SPN configurados.",
        is_correct: false,
        rationale: "Los miembros de Protected Users no pueden usar delegación Kerberos ni NTLM, lo cual frecuentemente rompe el funcionamiento de servicios empresariales y no previene la solicitud de TGS por usuarios del dominio.",
      },
      {
        text: "Configurar una política de bloqueo de cuenta (Account Lockout Policy) tras 3 intentos fallidos de logon.",
        is_correct: false,
        rationale: "Kerberoasting se realiza offline contra el ticket cifrado obtenido legítimamente; la política de bloqueo de cuenta no interviene en el cracking offline.",
      },
    ],
    explanation:
      "Kerberoasting aprovecha que cualquier usuario autenticado del dominio puede solicitar un ticket TGS para cualquier SPN registrado. Si la cuenta usa contraseñas débiles y RC4, el atacante puede descifrar offline el hash NTLM. La mitigación definitiva consiste en migrar a Group Managed Service Accounts (gMSA), que asignan contraseñas complejas aleatorias de 128 caracteres rotadas por AD y habilitan cifrado AES-256.",
    mitre_attack_id: "T1558.003",
    cve_id: "",
    canonical_hash: "",
    quality_score: 95,
    status: "approved",
  },
  {
    id: "gold_cloud_imds_02",
    domain: "Cloud & Infrastructure Security",
    category: "Cloud Security",
    subcategory: "IAM & Cloud Workload Defense",
    concept_id: "cloud_imds_ssrf",
    cognitive_level: "Apply",
    difficulty: "hard",
    prompt:
      "Un analista detecta una vulnerabilidad de Server-Side Request Forgery (SSRF) en un microservicio desplegado en una instancia EC2 de AWS con IP 198.51.100.24. El atacante intenta consultar 'http://169.254.169.254/latest/meta-data/iam/security-credentials/' para exfiltrar tokens de rol IAM. ¿Qué control a nivel de infraestructura mitiga eficazmente este vector sin alterar el código de la aplicación?",
    options: [
      {
        text: "Forzar el uso de Instance Metadata Service Version 2 (IMDSv2) configurando 'HttpTokens=required' y 'HttpPutResponseHopLimit=1'.",
        is_correct: true,
        rationale: "IMDSv2 exige una sesión orientada a token mediante una petición HTTP PUT previa con cabecera X-aws-ec2-metadata-token, neutralizando la mayoría de los SSRF simples.",
      },
      {
        text: "Asignar un Security Group a la instancia bloqueando el tráfico saliente al puerto 443 en la subred pública.",
        is_correct: false,
        rationale: "El endpoint de metadatos opera en 169.254.169.254:80 (HTTP enlace local); bloquear el 443 saliente no impide el acceso a IMDS.",
      },
      {
        text: "Habilitar AWS WAF directamente en la interfaz de red elástica (ENI) de la máquina virtual EC2.",
        is_correct: false,
        rationale: "AWS WAF no puede asociarse directamente a ENIs de EC2; requiere ALB, API Gateway, CloudFront o AppSync.",
      },
      {
        text: "Adjuntar una Service Control Policy (SCP) que restrinja la acción 'iam:PassRole' en toda la organización de AWS.",
        is_correct: false,
        rationale: "La SCP no bloquea la lectura local del endpoint de metadatos; únicamente restringe la asignación de roles a nivel de plano de control.",
      },
    ],
    explanation:
      "IMDSv2 mitiga SSRF al requerir un flujo de dos pasos: primero un PUT con 'X-aws-ec2-metadata-token-ttl-seconds' para obtener un token de sesión, y luego un GET con 'X-aws-ec2-metadata-token'. Al establecer 'HttpPutResponseHopLimit=1', los contenedores o proxies intermedios no pueden reenviar el token. Es la recomendación estándar de AWS para neutralizar extracción de credenciales de instancia.",
    mitre_attack_id: "T1552.005",
    cve_id: "",
    canonical_hash: "",
    quality_score: 96,
    status: "approved",
  },
  {
    id: "gold_net_bgp_rpki_03",
    domain: "Network Security & Architecture",
    category: "Network Security",
    subcategory: "Protocols & Traffic Inspection",
    concept_id: "bgp_routing_security",
    cognitive_level: "Evaluate",
    difficulty: "expert",
    prompt:
      "Un Proveedor de Servicios de Internet (ISP) observa que el prefijo IP 203.0.113.0/24 está siendo anunciado indebidamente por el Sistema Autónomo AS65001 en lugar de su legítimo originador AS65000, provocando un secuestro de tráfico (BGP Hijacking). ¿Qué tecnología de validación criptográfica en el plano de control BGP previene este incidente de forma automatizada en los routers de borde?",
    options: [
      {
        text: "Implementar Resource Public Key Infrastructure (RPKI) con validación de origen de ruta (Route Origin Authorization - ROA) en las sesiones eBGP.",
        is_correct: true,
        rationale: "RPKI vincula criptográficamente mediante certificados X.509 un prefijo IP con el número de Sistema Autónomo (ASN) autorizado para originarlo, permitiendo descartar anuncios 'Invalid'.",
      },
      {
        text: "Configurar filtros Unicast Reverse Path Forwarding (uRPF) en modo estricto en las interfaces eBGP del router de borde.",
        is_correct: false,
        rationale: "uRPF valida la IP de origen en el plano de datos para mitigar spoofing, pero no valida el ASN originador en los anuncios de rutas en el plano de control BGP.",
      },
      {
        text: "Habilitar autenticación MD5 (RFC 2385) con clave compartida en la sesión TCP del peer BGP.",
        is_correct: false,
        rationale: "BGP MD5 asegura la integridad de la sesión TCP directa entre vecinos adyacentes, pero no verifica la legitimidad del originador de las rutas anunciadas a través de múltiples saltos AS.",
      },
      {
        text: "Establecer la directiva BGP Maximum Prefix Limit en el peer para cortar la sesión al recibir más de 100 prefijos.",
        is_correct: false,
        rationale: "El límite de prefijos previene el agotamiento de memoria por fugas masivas (route leaks), pero no distingue si un anuncio individual específico es un secuestro de prefijo legítimo o no.",
      },
    ],
    explanation:
      "RPKI (Resource Public Key Infrastructure) permite a los operadores crear objetos ROA (Route Origin Authorization) firmados criptográficamente que certifican qué ASN tiene derecho a originar un determinado bloque de direcciones IP. Al activar BGP Route Origin Validation (ROV), los routers marcan como 'Invalid' y descartan anuncios no autorizados como el del AS atacante.",
    mitre_attack_id: "T1584.004",
    cve_id: "",
    canonical_hash: "",
    quality_score: 98,
    status: "approved",
  },
  {
    id: "gold_ep_process_hollowing_04",
    domain: "Security Operations & Defense",
    category: "Threat Hunting & EDR",
    subcategory: "Memory Forensics & Code Injection",
    concept_id: "proc_hollowing_detection",
    cognitive_level: "Analyze",
    difficulty: "expert",
    prompt:
      "Durante la inspección forense de un equipo comprometido con Windows 11, un analista de malware examina un proceso legítimo 'svchost.exe' con PID 3108. ¿Qué artefacto de memoria confirma inequívocamente la presencia de la técnica Process Hollowing (RunPE)?",
    options: [
      {
        text: "Discrepancia entre la imagen PE mapeada en el Process Environment Block (PEB) y el binario ejecutable en disco, junto con secciones de memoria marcadas como PAGE_EXECUTE_READWRITE desvinculadas de archivos en disco.",
        is_correct: true,
        rationale: "Process Hollowing desmapea (NtUnmapViewOfSection) el código original y escribe un PE malicioso en la memoria del proceso suspendido antes de reanudar el hilo principal.",
      },
      {
        text: "Presencia de un hilo con estado 'Wait:UserRequest' esperando eventos de sincronización del Kernel de Windows.",
        is_correct: false,
        rationale: "Es un estado completamente habitual y benigno para hilos en espera de peticiones RPC o mensajes de cola en Windows.",
      },
      {
        text: "Elevado número de Handles abiertos hacia la clave de registro 'HKLM\\SYSTEM\\CurrentControlSet\\Services'.",
        is_correct: false,
        rationale: "Svchost.exe alberga múltiples servicios del sistema operativo que leen legítimamente configuraciones de servicios en el registro de Windows.",
      },
      {
        text: "Diferencia de tiempo de 3 segundos entre el Timestamp del encabezado COFF y la fecha de creación del proceso.",
        is_correct: false,
        rationale: "El timestamp COFF refleja la fecha de compilación del binario en los laboratorios de Microsoft, mientras que la creación del proceso refleja el arranque local.",
      },
    ],
    explanation:
      "Process Hollowing crea un proceso suspendido (CREATE_SUSPENDED), vacía su memoria mediante NtUnmapViewOfSection o ZwUnmapViewOfSection, y escribe el código malicioso mediante VirtualAllocEx / WriteProcessMemory. En el análisis de memoria (e.g. Volatility malfind), esto se evidencia por páginas ejecutables (PAGE_EXECUTE_READWRITE) que no coinciden con las secciones del archivo svchost.exe respaldado en disco.",
    mitre_attack_id: "T1055.012",
    cve_id: "",
    canonical_hash: "",
    quality_score: 97,
    status: "approved",
  },
  {
    id: "gold_forensic_shimcache_05",
    domain: "Digital Forensics & Incident Response",
    category: "Digital Forensics",
    subcategory: "Disk & Artifact Analysis",
    concept_id: "forensics_shimcache_amcache",
    cognitive_level: "Evaluate",
    difficulty: "hard",
    prompt:
      "En una respuesta a incidentes tras una intrusión de ransomware, el analista forense necesita determinar si una herramienta de reconocimiento ejecutada por el atacante (ej: 'netscan.exe') llegó a ejecutarse efectivamente en una estación de trabajo, o si simplemente existió en el disco. ¿Cuál es la limitación crítica de la evidencia obtenida exclusivamente a través de ShimCache (AppCompatCache) en Windows?",
    options: [
      {
        text: "ShimCache registra binarios que interactuaron con el subsistema de compatibilidad de aplicaciones, pero la presencia de una entrada no garantiza por sí sola la ejecución efectiva del binario.",
        is_correct: true,
        rationale: "A partir de Windows 8/10/11, ShimCache puede registrar archivos por simple navegación en el explorador o interacción de metadatos, por lo que debe correlacionarse con Prefetch, Amcache o Event ID 4688.",
      },
      {
        text: "ShimCache se almacena exclusivamente en la memoria RAM y se destruye irreversiblemente al reiniciar el equipo.",
        is_correct: false,
        rationale: "Aunque se actualiza en memoria durante la sesión, ShimCache se escribe de forma persistente en el registro (SYSTEM hive) durante el apagado del sistema.",
      },
      {
        text: "ShimCache solo registra binarios de 32 bits y omite completamente ejecutables compilados para arquitectura x64.",
        is_correct: false,
        rationale: "El motor de compatibilidad de aplicaciones de Windows rastrea tanto ejecutables de 32 bits como de 64 bits.",
      },
      {
        text: "ShimCache cifra todas las rutas de archivos con clave AES derivada del SID del usuario activo.",
        is_correct: false,
        rationale: "ShimCache no está cifrado con AES; utiliza una estructura binaria propietaria (CSRSS/AppCompatCache) parseable mediante herramientas como AppCompatCacheParser.",
      },
    ],
    explanation:
      "A diferencia de los archivos Prefetch (.pf) o el log de eventos de creación de procesos (Event ID 4688) que prueban ejecución de código, ShimCache fue diseñado para rastrear compatibilidad de aplicaciones. En versiones modernas de Windows, una entrada en ShimCache prueba la existencia del archivo en el sistema y fecha de modificación, pero no prueba inequívocamente su ejecución.",
    mitre_attack_id: "T1007",
    cve_id: "",
    canonical_hash: "",
    quality_score: 95,
    status: "approved",
  },
];
