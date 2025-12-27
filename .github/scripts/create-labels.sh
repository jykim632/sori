#!/bin/bash

# GitHub Labels 생성 스크립트
# 사용법: gh CLI 설치 후 실행
# brew install gh && gh auth login && bash .github/scripts/create-labels.sh

# Type labels
gh label create "type: feature" --color "0E8A16" --description "새 기능" --force
gh label create "type: bug" --color "D73A4A" --description "버그 수정" --force
gh label create "type: refactor" --color "1D76DB" --description "리팩토링" --force
gh label create "type: docs" --color "0075CA" --description "문서" --force
gh label create "type: chore" --color "FEF2C0" --description "설정, 의존성 등" --force

# Scope labels
gh label create "scope: web" --color "C5DEF5" --description "apps/web" --force
gh label create "scope: cdn" --color "C5DEF5" --description "apps/cdn" --force
gh label create "scope: core" --color "C5DEF5" --description "packages/core" --force
gh label create "scope: database" --color "C5DEF5" --description "packages/database" --force

# Priority labels
gh label create "priority: high" --color "B60205" --description "긴급" --force
gh label create "priority: medium" --color "FBCA04" --description "보통" --force
gh label create "priority: low" --color "0E8A16" --description "낮음" --force

# Status labels
gh label create "status: blocked" --color "D93F0B" --description "블로킹됨" --force
gh label create "status: needs-review" --color "FBCA04" --description "리뷰 필요" --force

echo "Labels 생성 완료!"
