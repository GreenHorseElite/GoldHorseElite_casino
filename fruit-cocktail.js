// Инициализация игровых переменных
let balance = 1000;
let currentBet = 10;
let linesCount = 9;
let isSpinning = -0; // Флаг анимации вращения

// Доступные символы (названия соответствуют классам спрайта)
const symbols = [
    'strawberry', 
    'watermelon', 
    'pear', 
    'apple', 
    'lemon', 
    'peach', 
    'cherry', 
    'blue-cocktail' // Ваилд (коктейль)
];

// Таблица выплат (множители за 3 одинаковых символа на линии)
const payTable = {
    'strawberry': 200,
    'blue-cocktail': 100,
    'watermelon': 50,
    'pear': 20,
    'apple': 10,
    'lemon': 5,
    'peach': 3,
    'cherry': 2
};

// Сетка 3х3 (всего 9 ячеек)
const rows = 3;
const cols = 3;
let gridData = [
    ['strawberry', 'watermelon', 'pear'],
    ['apple', 'lemon', 'peach'],
    ['cherry', 'strawberry', 'blue-cocktail']
];

// Элементы интерфейса
const balanceEl = document.getElementById('balance-val');
const betEl = document.getElementById('bet-val');
const linesEl = document.getElementById('lines-val');
const slotGridEl = document.getElementById('slot-grid');
const spinBtn = document.getElementById('btn-spin');
const helpBtn = document.getElementById('btn-help');
const closeHelpBtn = document.getElementById('btn-close-modal');
const helpModal = document.getElementById('help-modal');
const paytableContainer = document.getElementById('paytable-container');

// Функция сопоставления имени символа с CSS-классом спрайта
function getSymbolClass(sym) {
    switch(sym) {
        case 'strawberry': return 'symbol-strawberry';
        case 'watermelon': return 'symbol-watermelon';
        case 'pear': return 'symbol-pear';
        case 'apple': return 'symbol-apple';
        case 'lemon': return 'symbol-lemon';
        case 'peach': return 'symbol-peach';
        case 'cherry': return 'symbol-cherry';
        case 'blue-cocktail': return 'symbol-cocktail';
        default: return '';
    }
}

// Рендер сетки барабанов на экране
function renderGrid() {
    slotGridEl.innerHTML = '';
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const cell = document.createElement('div');
            cell.className = 'slot-cell';
            cell.id = `cell-${r}-${c}`;
            
            const symDiv = document.createElement('div');
            symDiv.className = `slot-symbol ${getSymbolClass(gridData[r][c])}`;
            
            cell.appendChild(symDiv);
            slotGridEl.appendChild(cell);
        }
    }
}

// Обновление цифр на панели управления
function updateUI() {
    balanceEl.innerText = balance;
    betEl.innerText = currentBet;
    linesEl.innerText = linesCount;
}

// Запуск вращения
function startSpin() {
    if (isSpinning) return;
    if (balance < currentBet) {
        alert('Недостаточно средств на балансе!');
        return;
    }

    balance -= currentBet;
    updateUI();
    isSpinning = true;
    spinBtn.disabled = true;

    // Очищаем прошлые подсветки
    document.querySelectorAll('.slot-cell').forEach(cell => cell.classList.remove('winning'));

    // Эффект крутящихся барабанов (интервал смены рандомных картинок)
    let spinTimer = setInterval(() => {
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const randomSym = symbols[Math.floor(Math.random() * symbols.length)];
                gridData[r][c] = randomSym;
                const cellDiv = document.querySelector(`#cell-${r}-${c} .slot-symbol`);
                if (cellDiv) {
                    cellDiv.className = `slot-symbol ${getSymbolClass(randomSym)}`;
                }
            }
        }
    }, 80);

    // Остановка через 1.5 секунды
    setTimeout(() => {
        clearInterval(spinTimer);
        generateFinalGrid();
        renderGrid();
        checkWin();
        isSpinning = false;
        spinBtn.disabled = false;
    }, 1500);
}

// Генерация финального результата после остановки
function generateFinalGrid() {
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const randomSym = symbols[Math.floor(Math.random() * symbols.length)];
            gridData[r][c] = randomSym;
        }
    }
}

// Проверка выигрышных комбинаций
function checkWin() {
    let roundWin = 0;

    // Простая проверка горизонтальных линий на выигрыш
    for (let r = 0; r < rows; r++) {
        const firstSym = gridData[r][0];
        if (gridData[r][1] === firstSym && gridData[r][2] === firstSym) {
            const multiplier = payTable[firstSym] || 0;
            roundWin += currentBet * (multiplier / 10); // Смягченный коэффициент для баланса
            
            // Подсвечиваем выигрышный ряд
            for (let c = 0; c < cols; c++) {
                document.getElementById(`cell-${r}-${c}`).classList.add('winning');
            }
        }
    }

    if (roundWin > 0) {
        balance += roundWin;
        updateUI();
    }
}

// Заполнение модального окна справки таблицей выплат со спрайтами
function initPayTable() {
    paytableContainer.innerHTML = '';
    for (let [sym, mult] of Object.entries(payTable)) {
        const row = document.createElement('div');
        row.className = 'paytable-row';
        
        const iconDiv = document.createElement('div');
        iconDiv.className = `slot-symbol ${getSymbolClass(sym)}`;
        iconDiv.style.width = '30px';
        iconDiv.style.height = '30px';

        const textSpan = document.createElement('span');
        textSpan.innerText = `x${mult}`;
        textSpan.style.color = '#ffcc00';
        textSpan.style.fontWeight = 'bold';

        row.appendChild(iconDiv);
        row.appendChild(textSpan);
        paytableContainer.appendChild(row);
    }
}

// События кнопок
spinBtn.addEventListener('click', startSpin);

helpBtn.addEventListener('click', () => {
    helpModal.classList.remove('hidden');
});

closeHelpBtn.addEventListener('click', () => {
    helpModal.classList.add('hidden');
});

// Кнопка смены ставки
document.getElementById('btn-bet').addEventListener('click', () => {
    currentBet = currentBet === 10 ? 50 : currentBet === 50 ? 100 : 10;
    updateUI();
});

// Первичная инициализация при загрузке страницы
window.addEventListener('DOMContentLoaded', () => {
    renderGrid();
    updateUI();
    initPayTable();
});
