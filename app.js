// Définit un opérateur par défaut (à adapter selon votre système d'authentification)
let currentOperator = "username";

// Initialize global inventory data structure in localStorage if it doesn't exist
if (!localStorage.getItem('inventory')) {
    localStorage.setItem('inventory', JSON.stringify({}));
}

// Fonction pour obtenir l'inventaire de l'opérateur connecté
function getOperatorInventory(operator) {
    const globalInventory = JSON.parse(localStorage.getItem('inventory'));
    if (!globalInventory[operator]) {
        // Crée un inventaire vide pour cet opérateur
        globalInventory[operator] = {
            items: {},
            transactions: [],
            itemTypes: []
        };
        localStorage.setItem('inventory', JSON.stringify(globalInventory));
    }
    return globalInventory[operator];
}

// Fonction utilitaire pour afficher des notifications
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 px-6 py-3 rounded-md text-white ${
        type === 'success' ? 'bg-green-600' : 'bg-red-600'
    }`;
    notification.textContent = message;
    document.body.appendChild(notification);

    // Supprime la notification après 3 secondes
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Fonction pour mettre à jour l'inventaire de l'opérateur connecté
function updateInventory(type, quantity, isAddition = true, service = null, operateur = currentOperator) {
    const globalInventory = JSON.parse(localStorage.getItem('inventory'));
    const inventory = getOperatorInventory(operateur);

    // Initialise la quantité pour ce type d'article s'il n'existe pas
    if (!inventory.items[type]) {
        inventory.items[type] = 0;
    }

    // Met à jour la quantité
    if (isAddition) {
        inventory.items[type] += quantity;
    } else {
        // Vérifie qu'il y a suffisamment de stock
        if (inventory.items[type] < quantity) {
            throw new Error(`Stock insuffisant pour ${type}`);
        }
        inventory.items[type] -= quantity;
    }

    // Enregistre la transaction avec les informations de l'opérateur
    inventory.transactions.push({
        type,
        quantity,
        isAddition,
        service,
        operateur,
        date: new Date().toISOString()
    });

    // Ajoute le type d'article à la liste s'il n'est pas déjà présent
    if (!inventory.itemTypes.includes(type)) {
        inventory.itemTypes.push(type);
    }

    // Sauvegarde l'inventaire mis à jour pour cet opérateur dans l'inventaire global
    globalInventory[operateur] = inventory;
    localStorage.setItem('inventory', JSON.stringify(globalInventory));
    
    // Met à jour les affichages
    updateStockDisplay();
    updateHistoryDisplay();
    document.dispatchEvent(new Event('inventoryUpdated'));
}

// Fonction pour mettre à jour le dropdown du formulaire de sortie
function updateTypeDropdown() {
    const typeSelect = document.getElementById('type-sortie');
    const globalInventory = JSON.parse(localStorage.getItem('inventory'));
    const inventory = globalInventory[currentOperator] || { items: {} };
    
    // Sauvegarde la sélection actuelle
    const currentSelection = typeSelect.value;
    
    // Efface les options actuelles sauf le placeholder
    while (typeSelect.options.length > 1) {
        typeSelect.remove(1);
    }
    
    // Ajoute les options pour chaque type d'article de l'inventaire de l'opérateur
    Object.entries(inventory.items)
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([type, quantity]) => {
            if (quantity > 0) { // Affiche uniquement si le stock est > 0
                const option = document.createElement('option');
                option.value = type;
                option.textContent = type; // Affiche uniquement le type sans la quantité
                typeSelect.appendChild(option);
            }
        });
    
    // Restaure la sélection si elle est encore valide
    if (currentSelection && [...typeSelect.options].some(opt => opt.value === currentSelection)) {
        typeSelect.value = currentSelection;
    }
}

// Met à jour le dropdown lorsque l'inventaire est modifié
document.addEventListener('inventoryUpdated', updateTypeDropdown);

// Fonction pour mettre à jour le tableau d'état du stock
function updateStockDisplay() {
    const tableBody = document.getElementById('stock-table-body');
    const globalInventory = JSON.parse(localStorage.getItem('inventory'));
    const inventory = currentOperator === 'hakima' ? globalInventory : globalInventory[currentOperator] || { items: {} };
    
    // Efface le contenu actuel du tableau
    tableBody.innerHTML = '';

    // Vérifie s'il y a des articles
    if (Object.keys(inventory.items).length === 0) {
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = `
            <td colspan="2" class="px-6 py-4 text-center text-gray-500">
                <i class="fas fa-box-open mr-2"></i>
                Aucun élément en stock
            </td>
        `;
        tableBody.appendChild(emptyRow);
        return;
    }

    // Ajoute chaque article au tableau
    Object.entries(inventory.items)
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([type, quantity]) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-900">${type}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm ${quantity === 0 ? 'text-red-600' : 'text-gray-900'}">
                        ${quantity}
                    </div>
                </td>
            `;
            tableBody.appendChild(row);
        });
}

// Fonction pour formater la date
function formatDate(isoString) {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
}

// Fonction pour mettre à jour le tableau de l'historique des transactions
function updateHistoryDisplay() {
    const tableBody = document.getElementById('history-table-body');
    const globalInventory = JSON.parse(localStorage.getItem('inventory'));
    const inventory = currentOperator === 'hakima' ? globalInventory : globalInventory[currentOperator] || { transactions: [] };
    
    // Efface le contenu actuel du tableau
    tableBody.innerHTML = '';

    // Vérifie s'il y a des transactions
    if (!inventory.transactions || inventory.transactions.length === 0) {
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = `
            <td colspan="6" class="px-6 py-4 text-center text-gray-500">
                <i class="fas fa-info-circle mr-2"></i>
                Aucune opération enregistrée
            </td>
        `;
        tableBody.appendChild(emptyRow);
        return;
    }

    // Ajoute chaque transaction au tableau en ordre chronologique inverse
    inventory.transactions
        .slice()
        .reverse()
        .forEach(transaction => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${formatDate(transaction.date)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${transaction.type}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        transaction.isAddition 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                    }">
                        ${transaction.isAddition ? 'Réception' : 'Sortie'}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${transaction.quantity}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${transaction.service || '-'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${transaction.operateur}
                </td>
            `;
            tableBody.appendChild(row);
        });
}

// Gestion de la soumission du formulaire de réception
document.getElementById('reception-form').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const type = document.getElementById('type-reception').value.trim();
    const quantity = parseInt(document.getElementById('quantity-reception').value);

    try {
        updateInventory(type, quantity, true, null, currentOperator);
        showNotification(`Réception de ${quantity} ${type} enregistrée avec succès`);
        this.reset();
    } catch (error) {
        showNotification(error.message, 'error');
    }
});

// Gestion de la soumission du formulaire de sortie
document.getElementById('sortie-form').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const type = document.getElementById('type-sortie').value.trim();
    const quantity = parseInt(document.getElementById('quantity-sortie').value);
    const service = document.getElementById('service').value.trim();

    try {
        updateInventory(type, quantity, false, service, currentOperator);
        showNotification(`Sortie de ${quantity} ${type} vers ${service} enregistrée avec succès`);
        this.reset();
    } catch (error) {
        showNotification(error.message, 'error');
    }
});

// Fonction pour mettre à jour la datalist avec les types d'articles
function updateItemTypesList() {
    const globalInventory = JSON.parse(localStorage.getItem('inventory'));
    const inventory = globalInventory[currentOperator] || { itemTypes: [] };
    const datalist = document.getElementById('item-types-list');
    
    // Efface les options actuelles
    datalist.innerHTML = '';
    
    // Ajoute chaque type unique d'article
    inventory.itemTypes.forEach(type => {
        const option = document.createElement('option');
        option.value = type;
        datalist.appendChild(option);
    });
}

// Initialise les affichages et les dropdowns dès le chargement de la page
document.addEventListener('DOMContentLoaded', () => {
    updateStockDisplay();
    updateTypeDropdown();
    updateHistoryDisplay();
    updateItemTypesList();
});
