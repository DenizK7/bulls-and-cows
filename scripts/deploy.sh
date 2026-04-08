#!/bin/bash
set -e
echo "Building and deploying..."
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
echo "Deployed! Check: docker compose -f docker-compose.prod.yml logs -f"
