#!/usr/bin/env bash

ORG="bth-algo"  # Ändra till din organisation OBS does not work

REPO_NAME="${1:?Usage: sync-labels.sh <repo-name>}"


# Sökväg till din JSON
LABELS_JSON="./../../org-settings/labels.json"

# ---------- Förutsättningar ----------
command -v jq >/dev/null || { echo "jq saknas i PATH"; exit 1; }
command -v gh >/dev/null || { echo "GitHub CLI 'gh' saknas i PATH"; exit 1; }


# Kontrollera att du är inloggad mot gh
gh auth status >/dev/null || { echo "gh auth saknas – kör 'gh auth login'"; exit 1; }

# Validera JSON
jq . "$LABELS_JSON" >/dev/null


count=$(jq -r '.labels | length' "$LABELS_JSON")
if [[ "$count" == "null" || "$count" -eq 0 ]]; then
    echo "Inga labels i $LABELS_JSON"
    exit 0
fi

echo "== Förhandsgranskning från jq =="
jq -r '.labels[] | [.name, .color, .description] | @tsv' "$LABELS_JSON" | sed -n '1,2p'
echo "================================"
echo


# ---------- Läs JSON -> skapa “objekt” ----------
# Vi håller en lista med objektnamn (label_0, label_1, ...)
declare -a LABEL_OBJECTS=()

while IFS=$'\t' read -r name color description; do
    obj="label_${#LABEL_OBJECTS[@]}"
    declare -Ag "$obj"

    # Fyll fälten – dynamiskt namn kräver eval
    eval "$obj[name]=\"\$name\""
    eval "$obj[color]=\"\$color\""
    eval "$obj[description]=\"\$description\""


    # lägg till objektet i listan

    LABEL_OBJECTS+=("$obj")

    # Debug: visa att objektet skapats och att listan växer
    # echo "DEBUG obj='$obj'"
    # declare -p "$obj" || true
    # declare -p LABEL_OBJECTS || true

# VIKTIGT: process substitution, INTE pipeline!
done < <(jq -r '.labels[] | [.name, .color, .description] | @tsv' "$LABELS_JSON")


# ---------- Skapa/uppdatera labels i målrepo ----------
echo "Skapar/uppdaterar labels i $ORG/$REPO_NAME..."

for obj in "${LABEL_OBJECTS[@]}"; do
    # Namnreferens till assoc-arrayen
    declare -n label="$obj"

    name="${label[name]}"
    color="${label[color]}"
    description="${label[description]}"

    #echo "➡️  Label:"
    #echo "   Name: $name"
    #echo "   Color: $color"
    #echo "   Description: $description"

    # Försök skapa
    if ! gh api \
        "repos/$ORG/$REPO_NAME/labels" \
        -f name="$name" \
        -f color="$color" \
        -f description="$description" \
        >/dev/null 2>&1; then
    # Om det misslyckas (oftast 422: label finns) -> uppdatera

    gh api \
        -X PATCH \
        "repos/$ORG/$REPO_NAME/labels/$(
            # label-namnet måste URL-encodas; använd jq -sRr @uri
            printf '%s' "$name" | jq -sRr @uri
        )" \
        -f new_name="$name" \
        -f color="$color" \
        -f description="$description" \
        >/dev/null
        #echo "   ♻️  Uppdaterad"
    fi

    echo
done

echo "🎉 Klar!"
