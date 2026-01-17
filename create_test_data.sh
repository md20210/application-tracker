#!/bin/bash

################################################################################
# Create Test Data for Application Tracker
# Creates sample ZIP files with demo application documents
################################################################################

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}📝 Creating Test Application Data${NC}"
echo "=========================================="

TEST_DIR="/mnt/e/CodelocalLLM/applicationtracker/test_data"
mkdir -p "$TEST_DIR"

# Function to create a sample document
create_doc() {
    local company=$1
    local filename=$2
    local content=$3

    echo "$content" > "$TEST_DIR/$company/$filename"
}

# Create Allianz test application
echo -e "\n${YELLOW}Creating test application: Allianz${NC}"
mkdir -p "$TEST_DIR/Allianz"

create_doc "Allianz" "CV.txt" "LEBENSLAUF
Max Mustermann
Software Engineer

BERUFSERFAHRUNG
- Senior Developer bei TechCorp (2020-2024)
  * FastAPI Backend Development
  * React Frontend
  * PostgreSQL Datenbank-Design

- Full Stack Developer bei StartupXYZ (2018-2020)
  * Python, JavaScript, Docker
  * Microservices Architektur

AUSBILDUNG
- M.Sc. Informatik, TU München (2016-2018)
- B.Sc. Informatik, LMU München (2013-2016)

SKILLS
- Python (FastAPI, Django, Flask)
- JavaScript/TypeScript (React, Node.js)
- Datenbanken (PostgreSQL, MongoDB)
- Cloud (AWS, Railway)
- DevOps (Docker, CI/CD)

SPRACHEN
- Deutsch (Muttersprache)
- Englisch (Fließend)"

create_doc "Allianz" "Anschreiben.txt" "Bewerbung als Senior Backend Developer

Sehr geehrte Damen und Herren,

mit großem Interesse habe ich Ihre Stellenausschreibung für die Position
als Senior Backend Developer gelesen. Die Möglichkeit, an innovativen
Versicherungslösungen mitzuarbeiten, reizt mich sehr.

In meiner aktuellen Position bei TechCorp entwickle ich seit 4 Jahren
skalierbare Backend-Systeme mit Python und FastAPI. Besonders stolz bin
ich auf die Implementierung eines RAG-basierten Chatbots, der die
Kundenanfragen um 40% reduziert hat.

Meine Erfahrung mit modernen Technologien wie PostgreSQL, Docker und
Cloud-Infrastrukturen macht mich zum idealen Kandidaten für Ihr Team.

Ich freue mich auf ein persönliches Gespräch.

Mit freundlichen Grüßen
Max Mustermann"

create_doc "Allianz" "Zeugnis_TechCorp.txt" "ARBEITSZEUGNIS

TechCorp GmbH
München

Herr Max Mustermann, geboren am 01.01.1990, war vom 01.03.2020 bis
31.12.2024 als Senior Software Developer in unserem Unternehmen tätig.

Aufgabenbereiche:
- Entwicklung von Backend-Systemen mit Python/FastAPI
- Datenbank-Design und Optimierung
- Technische Führung im Team

Leistungsbeurteilung:
Herr Mustermann hat seine Aufgaben stets zu unserer vollsten Zufriedenheit
erledigt. Seine Arbeitsqualität war hervorragend, und er zeigte stets
großes Engagement. Besonders hervorzuheben sind seine technischen
Fähigkeiten und seine Fähigkeit, komplexe Probleme zu lösen.

Wir bedauern sein Ausscheiden und wünschen ihm für die Zukunft alles Gute.

München, den 31.12.2024
TechCorp GmbH
i.V. Dr. Schmidt"

# Create SAP test application
echo -e "${YELLOW}Creating test application: SAP${NC}"
mkdir -p "$TEST_DIR/SAP"

create_doc "SAP" "CV.txt" "CURRICULUM VITAE
Max Mustermann

PROFESSIONAL EXPERIENCE
- Senior Developer at TechCorp (2020-2024)
- Full Stack Developer at StartupXYZ (2018-2020)

EDUCATION
- M.Sc. Computer Science, TU Munich
- B.Sc. Computer Science, LMU Munich

TECHNICAL SKILLS
- Python, JavaScript, TypeScript
- FastAPI, React, Node.js
- PostgreSQL, Docker, Kubernetes
- Cloud Platforms (AWS, Azure)"

create_doc "SAP" "Cover_Letter.txt" "Application for Cloud Engineer Position

Dear SAP Hiring Team,

I am writing to express my strong interest in the Cloud Engineer position.
With 6+ years of experience in software development and cloud infrastructure,
I am excited about the opportunity to contribute to SAP's cloud solutions.

My experience includes:
- Building scalable microservices with Python and FastAPI
- Managing PostgreSQL databases with millions of records
- Implementing CI/CD pipelines and infrastructure as code

I look forward to discussing how my skills align with SAP's needs.

Best regards,
Max Mustermann"

# Create Siemens test application
echo -e "${YELLOW}Creating test application: Siemens${NC}"
mkdir -p "$TEST_DIR/Siemens"

create_doc "Siemens" "Lebenslauf.txt" "LEBENSLAUF
Max Mustermann

IoT & Backend Spezialist

BERUFLICHER WERDEGANG
2020-2024: Senior Developer bei TechCorp
- IoT Plattform Entwicklung
- REST API Design
- Cloud Integration

2018-2020: Developer bei StartupXYZ
- Python Backend Development
- React Frontend

TECHNISCHE EXPERTISE
- Python, FastAPI, Django
- IoT Protokolle (MQTT, CoAP)
- PostgreSQL, TimescaleDB
- Docker, Kubernetes"

# Create ZIP files
echo -e "\n${YELLOW}Creating ZIP archives...${NC}"
cd "$TEST_DIR"

zip -r -q Allianz.zip Allianz/
zip -r -q SAP.zip SAP/
zip -r -q Siemens.zip Siemens/

# Clean up text files
rm -rf Allianz SAP Siemens

echo -e "\n${GREEN}✅ Test data created!${NC}"
echo ""
echo "Created ZIP files:"
ls -lh "$TEST_DIR"/*.zip
echo ""
echo "Location: $TEST_DIR"
echo ""
echo "Next steps:"
echo "  1. Start the application: ./start_local_test.sh"
echo "  2. Go to Upload tab"
echo "  3. Upload one of the ZIP files:"
echo "     - Allianz.zip"
echo "     - SAP.zip"
echo "     - Siemens.zip"
echo "=========================================="
