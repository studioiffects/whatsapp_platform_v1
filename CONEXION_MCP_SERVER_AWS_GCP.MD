---
name: conexion-mcp-server-aws-gcp
description: Guia tecnica detallada para conectar un entorno de desarrollo a servidores MCP de AWS y GCP, incluyendo autenticacion, permisos IAM, configuracion de clientes MCP, pruebas, seguridad, troubleshooting y operacion.
---

# Conexion MCP Server AWS + GCP

## 1. Objetivo
Estandarizar la conexion del entorno de desarrollo a:
1. AWS MCP Server (administrado por AWS, autenticado con SigV4 via proxy local).
2. GCP MCP Server remoto de BigQuery (`https://bigquery.googleapis.com/mcp`).
3. GCP MCP Toolbox local (server MCP por `stdio`) para casos IDE/agent.

Este runbook permite operar ambos proveedores al mismo tiempo desde un cliente MCP (Cursor, Claude Desktop, Kiro CLI u otro host compatible).

## 2. Modelos de conexion soportados
### 2.1 AWS MCP Server (recomendado para AWS)
1. Cliente MCP local -> `mcp-proxy-for-aws` (local) -> AWS MCP endpoint.
2. El proxy firma peticiones con credenciales locales AWS (SigV4).

### 2.2 GCP BigQuery MCP remoto
1. Cliente MCP -> endpoint remoto HTTP `https://bigquery.googleapis.com/mcp`.
2. Autenticacion OAuth2/IAM de Google Cloud.
3. No acepta API keys.

### 2.3 GCP MCP Toolbox local
1. Cliente MCP -> proceso local (`npx @toolbox-sdk/server --prebuilt bigquery --stdio`).
2. Toolbox opera como control plane local hacia BigQuery y otras fuentes.
3. Recomendado para IDEs que usan MCP por `stdio`.

## 3. Prerrequisitos
### 3.1 Herramientas
1. `aws` CLI.
2. `uv` (requerido por `uvx mcp-proxy-for-aws`).
3. `gcloud` CLI.
4. `node` y `npm` (si usaras `npx @toolbox-sdk/server`).
5. Cliente MCP (Cursor/Claude/Kiro/etc).

### 3.2 Versiones minimas recomendadas
1. AWS CLI `2.32.0+` si usaras `aws login`.
2. Google Cloud SDK reciente con `gcloud beta`.
3. Node LTS actual.

### 3.3 Verificacion rapida
```bash
aws --version
uv --version
gcloud --version
node --version
npm --version
```

## 4. Configuracion AWS MCP Server
## 4.1 Configurar credenciales AWS
Opcion A (recomendada si usas consola AWS):
```bash
aws login
```

Opcion B (IAM Identity Center / SSO):
```bash
aws configure sso
```

Opcion C (Access keys IAM):
```bash
aws configure
```

Validar identidad:
```bash
aws sts get-caller-identity
```

## 4.2 Instalar `uv` (si falta)
Linux/macOS:
```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

Windows PowerShell:
```powershell
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```

## 4.3 Permisos IAM minimos AWS MCP
Si no usas rol administrador, adjuntar politica:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "aws-mcp:InvokeMcp",
        "aws-mcp:CallReadOnlyTool",
        "aws-mcp:CallReadWriteTool"
      ],
      "Resource": "*"
    }
  ]
}
```

## 4.4 Configuracion MCP client para AWS
Ejemplo:
```json
{
  "mcpServers": {
    "aws-mcp": {
      "command": "uvx",
      "args": [
        "mcp-proxy-for-aws@latest",
        "https://aws-mcp.us-east-1.api.aws/mcp",
        "--metadata",
        "AWS_REGION=us-west-2"
      ]
    }
  }
}
```

Notas:
1. Si no defines `AWS_REGION`, el comportamiento por defecto es `us-east-1`.
2. El primer arranque puede demorar por descarga/cache de dependencias.

## 5. Configuracion GCP BigQuery MCP remoto
## 5.1 Autenticacion y proyecto
```bash
gcloud auth login
gcloud auth application-default login
gcloud config set project TU_PROJECT_ID
```

## 5.2 Roles IAM minimos (BigQuery MCP remoto)
1. `roles/serviceusage.serviceUsageAdmin`
2. `roles/mcp.toolUser`
3. `roles/bigquery.jobUser`
4. `roles/bigquery.dataViewer`

## 5.3 Habilitar MCP server BigQuery
```bash
gcloud beta services mcp enable bigquery.googleapis.com --project=TU_PROJECT_ID
```

Deshabilitar:
```bash
gcloud beta services mcp disable bigquery.googleapis.com --project=TU_PROJECT_ID
```

Nota de fecha:
1. Segun documentacion oficial, desde el **17 de marzo de 2026** el BigQuery remote MCP server se habilita automaticamente al habilitar BigQuery.
2. Antes de esa fecha debes habilitarlo manualmente con `gcloud beta services mcp enable`.

## 5.4 Parametros del servidor remoto GCP
1. URL/Endpoint: `https://bigquery.googleapis.com/mcp`
2. Transport: HTTP
3. Auth: credenciales Google Cloud (OAuth2/IAM)

## 6. Configuracion GCP MCP Toolbox local (stdio)
## 6.1 Configuracion rapida con `npx`
```json
{
  "mcpServers": {
    "gcp-bigquery-toolbox": {
      "command": "npx",
      "args": ["-y", "@toolbox-sdk/server", "--prebuilt", "bigquery", "--stdio"],
      "env": {
        "BIGQUERY_PROJECT": "TU_PROJECT_ID"
      }
    }
  }
}
```

## 6.2 Alternativa binaria (produccion)
1. Descargar `toolbox` para tu OS desde releases oficiales.
2. Configurar cliente MCP para ejecutar el binario local:
```json
{
  "mcpServers": {
    "gcp-bigquery-toolbox": {
      "command": "./PATH/TO/toolbox",
      "args": ["--prebuilt", "bigquery", "--stdio"],
      "env": {
        "BIGQUERY_PROJECT": "TU_PROJECT_ID"
      }
    }
  }
}
```

## 7. Configuracion combinada AWS + GCP en un solo cliente
Ejemplo compuesto:
```json
{
  "mcpServers": {
    "aws-mcp": {
      "command": "uvx",
      "args": [
        "mcp-proxy-for-aws@latest",
        "https://aws-mcp.us-east-1.api.aws/mcp",
        "--metadata",
        "AWS_REGION=us-west-2"
      ]
    },
    "gcp-bigquery-toolbox": {
      "command": "npx",
      "args": ["-y", "@toolbox-sdk/server", "--prebuilt", "bigquery", "--stdio"],
      "env": {
        "BIGQUERY_PROJECT": "TU_PROJECT_ID"
      }
    }
  }
}
```

## 8. Validacion de conexion (checklist)
1. Reinicia el cliente MCP.
2. Verifica que ambos servidores aparezcan activos.
3. Test AWS:
   - Prompt sugerido: `Lista las regiones disponibles de AWS`.
4. Test GCP BigQuery:
   - Prompt sugerido: `Lista los datasets en TU_PROJECT_ID`.
5. Si tu cliente soporta comandos de inspeccion:
   - `/mcp`
   - `/tools`

## 9. Hardening y seguridad
1. Nunca usar root en AWS para operacion MCP.
2. Aplicar principio de menor privilegio en AWS/GCP.
3. Segmentar perfiles por entorno (`dev`, `staging`, `prod`).
4. Rotar credenciales periodicamente.
5. Evitar API keys para BigQuery MCP remoto (no soportadas).
6. Auditar uso de herramientas MCP en logs del proveedor.
7. Habilitar escaneo y controles de contenido en GCP si aplica (Model Armor para trafico MCP).

## 10. Troubleshooting
### 10.1 AWS auth falla
1. Ejecutar `aws sts get-caller-identity`.
2. Renovar sesion (`aws login` / `aws sso login`).
3. Revisar politica IAM `aws-mcp:*`.

### 10.2 `uvx` no encontrado
1. Reinstalar `uv`.
2. Confirmar PATH del usuario.

### 10.3 GCP permiso denegado
1. Revisar rol `roles/mcp.toolUser`.
2. Revisar `roles/bigquery.jobUser` y `roles/bigquery.dataViewer`.
3. Confirmar proyecto activo con `gcloud config get-value project`.

### 10.4 BigQuery MCP no habilitado
1. Ejecutar:
```bash
gcloud beta services mcp enable bigquery.googleapis.com --project=TU_PROJECT_ID
```

### 10.5 Cliente no carga MCP server
1. Validar JSON de configuracion.
2. Reiniciar cliente completamente.
3. Verificar rutas de binarios (`uvx`, `npx`, `toolbox`).

## 11. Operacion recomendada por ambiente
1. `dev`: `mcp-proxy-for-aws@latest` y `npx @toolbox-sdk/server`.
2. `staging/prod`: fijar versiones explicitas de proxy/toolbox (evitar `latest`).
3. Mantener archivo de configuracion MCP versionado (sin secretos).
4. Separar identidades AWS/GCP por ambiente.

## 12. Referencias oficiales
1. AWS MCP setup:
   - https://docs.aws.amazon.com/aws-mcp/latest/userguide/getting-started-aws-mcp-server.html
2. AWS MCP Proxy:
   - https://github.com/aws/mcp-proxy-for-aws
3. AWS MCP docs:
   - https://docs.aws.amazon.com/aws-mcp/latest/userguide/what-is-mcp-server.html
4. BigQuery MCP remoto:
   - https://docs.cloud.google.com/bigquery/docs/use-bigquery-mcp
5. BigQuery con MCP Toolbox:
   - https://docs.cloud.google.com/bigquery/docs/pre-built-tools-with-mcp-toolbox
6. MCP Toolbox (open source):
   - https://github.com/googleapis/genai-toolbox
