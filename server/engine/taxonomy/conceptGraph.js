/**
 * Comprehensive Cybersecurity Concept Graph & Taxonomy
 * Maps Domain -> Category -> Subcategory -> Concepts -> Learning Objectives
 */

export const CONCEPT_GRAPH = [
  {
    domain: "Network Security & Architecture",
    category: "Network Security",
    subcategory: "Protocols & Traffic Inspection",
    concepts: [
      {
        id: "tcp_three_way_handshake",
        name: "TCP Three-Way Handshake & State Tracking",
        objectives: ["identify", "analyze", "differentiate"],
        cognitiveLevel: "Apply",
        difficulties: ["beginner", "intermediate"],
        types: ["multiple_choice", "scenario", "network_analysis"],
        tags: ["TCP", "Handshake", "Stateful Firewall", "SYN", "ACK"],
      },
      {
        id: "dns_security_dnssec",
        name: "DNS Resolution, Poisoning & DNSSEC Validation",
        objectives: ["diagnose", "detect", "explain"],
        cognitiveLevel: "Analyze",
        difficulties: ["intermediate", "advanced"],
        types: ["multiple_choice", "scenario", "log_analysis"],
        tags: ["DNS", "DNSSEC", "Cache Poisoning", "RRSIG", "DNS Tunneling"],
      },
      {
        id: "tls_handshake_crypto",
        name: "TLS 1.3 Negotiation & Perfect Forward Secrecy",
        objectives: ["differentiate", "evaluate", "explain"],
        cognitiveLevel: "Analyze",
        difficulties: ["intermediate", "advanced", "expert"],
        types: ["multiple_choice", "scenario"],
        tags: ["TLS", "HTTPS", "Cipher Suites", "PFS", "ECDHE"],
      },
      {
        id: "bgp_routing_security",
        name: "BGP Route Hijacking & RPKI Validation",
        objectives: ["analyze", "diagnose", "mitigate"],
        cognitiveLevel: "Advanced",
        difficulties: ["advanced", "expert"],
        types: ["scenario", "network_analysis"],
        tags: ["BGP", "RPKI", "Routing", "Autonomous System", "Hijacking"],
      },
      {
        id: "l2_mitigation_dai_dhcp_snooping",
        name: "Layer 2 Attacks: ARP Spoofing, DAI & DHCP Snooping",
        objectives: ["prioritize", "select", "differentiate"],
        cognitiveLevel: "Apply",
        difficulties: ["intermediate", "advanced"],
        types: ["multiple_choice", "scenario"],
        tags: ["ARP", "DAI", "DHCP Snooping", "Switching", "MitM"],
      },
    ],
  },
  {
    domain: "Security Operations & Defense",
    category: "SOC Analyst",
    subcategory: "Detection Engineering & SIEM Triage",
    concepts: [
      {
        id: "brute_force_password_spray",
        name: "Credential Stuffing & Password Spray Detection",
        objectives: ["correlate", "detect", "prioritize"],
        cognitiveLevel: "Analyze",
        difficulties: ["intermediate", "advanced"],
        types: ["scenario", "log_analysis"],
        tags: ["SOC", "SIEM", "Authentication", "Password Spray", "Threshold"],
      },
      {
        id: "sysmon_process_creation",
        name: "Sysmon Event ID 1: Process Creation & Parent-Child Anomalies",
        objectives: ["interpret", "analyze", "detect"],
        cognitiveLevel: "Analyze",
        difficulties: ["intermediate", "advanced"],
        types: ["log_analysis", "scenario"],
        tags: ["Sysmon", "Process Injection", "Parent-Child", "Living off the Land"],
      },
      {
        id: "soc_alert_triage_false_positives",
        name: "Alert Triage, Evidence Correlation & False Positive Suppression",
        objectives: ["evaluate", "prioritize", "respond"],
        cognitiveLevel: "Evaluate",
        difficulties: ["intermediate", "advanced"],
        types: ["scenario", "incident_response"],
        tags: ["SOC", "Triage", "Escalation", "False Positive", "Severity"],
      },
      {
        id: "edr_telemetry_beaconing",
        name: "C2 Beaconing Detection & Jitter Analysis",
        objectives: ["diagnose", "correlate", "detect"],
        cognitiveLevel: "Analyze",
        difficulties: ["advanced", "expert"],
        types: ["log_analysis", "scenario"],
        tags: ["EDR", "C2", "Beaconing", "Jitter", "Network Telemetry"],
      },
    ],
  },
  {
    domain: "Digital Forensics & Incident Response",
    category: "Digital Forensics",
    subcategory: "Artifact Analysis & Volatile Evidence",
    concepts: [
      {
        id: "windows_prefetch_execution",
        name: "Windows Prefetch (.pf) & Amcache Execution Evidence",
        objectives: ["interpret", "differentiate", "analyze"],
        cognitiveLevel: "Analyze",
        difficulties: ["intermediate", "advanced"],
        types: ["scenario", "forensics_artifact"],
        tags: ["DFIR", "Prefetch", "Amcache", "Execution Artifacts", "Timestamps"],
      },
      {
        id: "ram_acquisition_order_of_volatility",
        name: "Memory Forensics: Order of Volatility & Acquisition Rigor",
        objectives: ["prioritize", "explain", "select"],
        cognitiveLevel: "Apply",
        difficulties: ["beginner", "intermediate"],
        types: ["multiple_choice", "scenario"],
        tags: ["RAM", "RFC 3227", "Volatility", "Evidence Preservation", "Live Response"],
      },
      {
        id: "ntfs_mft_usnjrnl_timeline",
        name: "NTFS $MFT, $LogFile & USN Journal Timeline Reconstruction",
        objectives: ["analyze", "diagnose", "interpret"],
        cognitiveLevel: "Advanced",
        difficulties: ["advanced", "expert"],
        types: ["forensics_artifact", "scenario"],
        tags: ["NTFS", "MFT", "USN Journal", "Timestomping", "Anti-Forensics"],
      },
      {
        id: "chain_of_custody_hashing",
        name: "Digital Evidence Integrity, Hashing & Chain of Custody (ISO 27037)",
        objectives: ["evaluate", "explain", "differentiate"],
        cognitiveLevel: "Understand",
        difficulties: ["beginner", "intermediate"],
        types: ["multiple_choice", "scenario"],
        tags: ["ISO 27037", "Hash", "SHA-256", "Chain of Custody", "Legal Admissibility"],
      },
    ],
  },
  {
    domain: "Identity & Access Management",
    category: "Active Directory",
    subcategory: "Kerberos & Windows Domain Security",
    concepts: [
      {
        id: "kerberoasting_spn_exploitation",
        name: "Kerberoasting: Service Principal Names (SPN) & TGS Ticket Cracking",
        objectives: ["explain", "detect", "mitigate"],
        cognitiveLevel: "Analyze",
        difficulties: ["intermediate", "advanced"],
        types: ["scenario", "multiple_choice"],
        tags: ["Active Directory", "Kerberos", "SPN", "TGS", "Offline Cracking"],
      },
      {
        id: "pass_the_hash_ticket",
        name: "Pass-the-Hash (PtH) vs Pass-the-Ticket (PtT) Lateral Movement",
        objectives: ["differentiate", "analyze", "mitigate"],
        cognitiveLevel: "Analyze",
        difficulties: ["intermediate", "advanced"],
        types: ["scenario", "multiple_choice"],
        tags: ["NTLM", "Kerberos", "LSASS", "Lateral Movement", "Mimikatz"],
      },
      {
        id: "dcsync_replication_abuse",
        name: "DCSync Rights & Directory Replication Service (DRS) Abuse",
        objectives: ["detect", "diagnose", "evaluate"],
        cognitiveLevel: "Advanced",
        difficulties: ["advanced", "expert"],
        types: ["scenario", "log_analysis"],
        tags: ["DCSync", "Active Directory", "Replication", "Domain Admin", "Golden Ticket"],
      },
    ],
  },
  {
    domain: "Application & Cloud Security",
    category: "Cloud Security",
    subcategory: "Cloud Native & IAM Policies",
    concepts: [
      {
        id: "aws_imds_ssrf_mitigation",
        name: "SSRF Attacks against Cloud Instance Metadata (IMDSv1 vs IMDSv2)",
        objectives: ["differentiate", "mitigate", "analyze"],
        cognitiveLevel: "Analyze",
        difficulties: ["intermediate", "advanced"],
        types: ["scenario", "multiple_choice"],
        tags: ["AWS", "SSRF", "IMDSv2", "Cloud Metadata", "Token Header"],
      },
      {
        id: "kubernetes_rbac_container_breakout",
        name: "Kubernetes Privilege Escalation, hostPath & Container Breakout",
        objectives: ["diagnose", "mitigate", "prioritize"],
        cognitiveLevel: "Advanced",
        difficulties: ["advanced", "expert"],
        types: ["scenario", "configuration_analysis"],
        tags: ["Kubernetes", "Container Escape", "RBAC", "Admission Controllers", "Gatekeeper"],
      },
      {
        id: "cloud_iam_privilege_escalation",
        name: "Cloud IAM Misconfigurations & AssumeRole Escalation Chains",
        objectives: ["detect", "evaluate", "mitigate"],
        cognitiveLevel: "Analyze",
        difficulties: ["intermediate", "advanced"],
        types: ["scenario", "configuration_analysis"],
        tags: ["IAM", "AWS", "Azure", "Least Privilege", "AssumeRole"],
      },
    ],
  },
  {
    domain: "Application & Cloud Security",
    category: "Web Security",
    subcategory: "OWASP Top 10 & API Flaws",
    concepts: [
      {
        id: "sql_injection_parameterized_queries",
        name: "SQL Injection Vectors, Blind Exfiltration & Parameterized Defense",
        objectives: ["differentiate", "mitigate", "diagnose"],
        cognitiveLevel: "Apply",
        difficulties: ["beginner", "intermediate"],
        types: ["multiple_choice", "scenario", "code_analysis"],
        tags: ["OWASP", "SQLi", "Prepared Statements", "Input Validation", "WAF"],
      },
      {
        id: "jwt_signature_bypass_none_alg",
        name: "JSON Web Token (JWT) Exploitation: 'none' Algorithm & Key Confusion",
        objectives: ["analyze", "detect", "mitigate"],
        cognitiveLevel: "Analyze",
        difficulties: ["intermediate", "advanced"],
        types: ["scenario", "code_analysis"],
        tags: ["JWT", "Authentication", "Algorithm Confusion", "HMAC", "RSA"],
      },
      {
        id: "cors_misconfiguration_exfiltration",
        name: "CORS Misconfiguration: Wildcard Origins & Credentials Reflection",
        objectives: ["diagnose", "evaluate", "mitigate"],
        cognitiveLevel: "Analyze",
        difficulties: ["intermediate", "advanced"],
        types: ["scenario", "configuration_analysis"],
        tags: ["CORS", "Same-Origin Policy", "Web Security", "Credentials", "Headers"],
      },
    ],
  },
  {
    domain: "Threats & Adversary Intelligence",
    category: "MITRE ATT&CK",
    subcategory: "Adversary Tactics & Techniques",
    concepts: [
      {
        id: "mitre_persistence_scheduled_tasks",
        name: "Persistence: Scheduled Tasks & Cron Jobs (T1053)",
        objectives: ["correlate", "detect", "classify"],
        cognitiveLevel: "Analyze",
        difficulties: ["intermediate", "advanced"],
        types: ["scenario", "mitre_mapping", "log_analysis"],
        tags: ["MITRE", "Persistence", "T1053", "Scheduled Task", "Cron"],
      },
      {
        id: "mitre_defense_evasion_process_injection",
        name: "Defense Evasion: Process Injection & DLL Sideloading (T1055 / T1574)",
        objectives: ["differentiate", "detect", "analyze"],
        cognitiveLevel: "Advanced",
        difficulties: ["advanced", "expert"],
        types: ["scenario", "mitre_mapping"],
        tags: ["MITRE", "Defense Evasion", "Process Injection", "DLL Sideloading", "API Hooking"],
      },
    ],
  },
  {
    domain: "Threats & Adversary Intelligence",
    category: "Malware Analysis",
    subcategory: "Reverse Engineering & Triage",
    concepts: [
      {
        id: "static_analysis_packing_entropy",
        name: "Static Analysis: PE Headers, High Entropy & UPX Unpacking",
        objectives: ["interpret", "differentiate", "analyze"],
        cognitiveLevel: "Analyze",
        difficulties: ["intermediate", "advanced"],
        types: ["scenario", "multiple_choice"],
        tags: ["Malware", "PE Format", "Entropy", "Packers", "Obfuscation"],
      },
      {
        id: "dynamic_analysis_sandbox_evasion",
        name: "Dynamic Analysis: Sleep Accelerations, Sandbox Evasion & Anti-VM",
        objectives: ["detect", "explain", "mitigate"],
        cognitiveLevel: "Analyze",
        difficulties: ["advanced", "expert"],
        types: ["scenario", "multiple_choice"],
        tags: ["Malware", "Sandbox Evasion", "Anti-Debugging", "RDTSC", "API Hooking"],
      },
    ],
  },
];

export function getConceptById(conceptId) {
  for (const group of CONCEPT_GRAPH) {
    const found = group.concepts.find((c) => c.id === conceptId);
    if (found) {
      return {
        ...found,
        domain: group.domain,
        category: group.category,
        subcategory: group.subcategory,
      };
    }
  }
  return null;
}

export function getAllConcepts() {
  const result = [];
  for (const group of CONCEPT_GRAPH) {
    for (const c of group.concepts) {
      result.push({
        ...c,
        domain: group.domain,
        category: group.category,
        subcategory: group.subcategory,
      });
    }
  }
  return result;
}

export function getUnderrepresentedConcept(saturationMap) {
  const all = getAllConcepts();
  // Sort by lowest count in saturation map
  const sorted = [...all].sort((a, b) => {
    const countA = saturationMap[a.id] || 0;
    const countB = saturationMap[b.id] || 0;
    return countA - countB;
  });
  return sorted[0];
}
