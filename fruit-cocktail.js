const tg = window.Telegram.WebApp;
tg.expand();

let balance = localStorage.getItem('slot_balance') ? parseInt(localStorage.getItem('slot_balance')) : 11795;
let totalBet = 90;
let activeLines = 9;
let isSpinning = false;
let autoPlayActive = false;
let autoPlayTimer = null;
let soundEnabled = true;

const symbols = ['🍓', '🍉', '🍎', '🍑', '🍐', '🍒', '🍋', '🍇'];

// Сетка 5 колонок по 3 ряда (сохраняем элементы ячеек)
const gridElement = document.getElementById('slot-grid');
const cells = [];

for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 5; c++) {
        const cell = document.createElement('div');
        cell.className = 'slot-cell';
        cell.id = `cell-${r}-${c}`;
        cell.innerText = symbols[(r + c) % symbols.length];
        gridElement.appendChild(cell);
        cells.push({ row: r, col: c, element: cell });
    }
}

// Генерация кнопок линий
const linesContainer = document.getElementById('lines-selector');
[1, 3, 5, 7, 9].forEach(num => {
    const btn = document.createElement('div');
    btn.className = `line-btn ${num === activeLines ? 'active' : ''}`;
    btn.innerText = `${num} лин`;
    btn.onclick = () => setLines(num);
    btn.id = `line-btn-${num}`;
    linesContainer.appendChild(btn);
});

function updateUI() {
    document.getElementById('lobby-balance').innerText = balance;
    document.getElementById('slot-balance').innerText = balance;
    document.getElementById('ui-total-balance').innerText = balance;
    document.getElementById('ui-total-bet').innerText = totalBet;
    document.getElementById('ui-bet-per-line').innerText = (totalBet / activeLines).toFixed(1);
    document.getElementById('ui-lines-count').innerText = activeLines;
    
    localStorage.setItem('slot_balance', balance);
}

function openSlot() {
    document.getElementById('lobby-screen').style.display = 'none';
    document.getElementById('slot-screen').style.display = 'flex';
    updateUI();
}

function closeSlot() {
    stopAutoPlay();
    document.getElementById('slot-screen').style.display = 'none';
    document.getElementById('lobby-screen').style.display = 'flex';
}

function openBetModal() {
    if (isSpinning) return;
    document.getElementById('bet-range').value = totalBet;
    document.getElementById('modal-bet-val').innerText = totalBet;
    document.getElementById('bet-modal-overlay').style.display = 'flex';
}

function onSliderChange(val) {
    document.getElementById('modal-bet-val').innerText = val;
}

function closeBetModal() {
    totalBet = parseInt(document.getElementById('bet-range').value);
    document.getElementById('bet-modal-overlay').style.display = 'none';
    updateUI();
}

function setLines(num) {
    if (isSpinning) return;
    activeLines = num;
    document.querySelectorAll('.line-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`line-btn-${num}`).classList.add('active');
    updateUI();
}

function maxBet() {
    if (isSpinning) return;
    totalBet = 900;
    setLines(9);
    updateUI();
}

function toggleAutoPlay() {
    const btnAuto = document.getElementById('btn-auto');
    if (!autoPlayActive) {
        autoPlayActive = true;
        btnAuto.classList.add('active-mode');
        btnAuto.innerText = 'СТОП АВТО';
        startSpin();
    } else {
        stopAutoPlay();
    }
}

function stopAutoPlay() {
    autoPlayActive = false;
    const btnAuto = document.getElementById('btn-auto');
    btnAuto.classList.remove('active-mode');
    btnAuto.innerText = 'АВТОИГРА';
    if (autoPlayTimer) {
        clearTimeout(autoPlayTimer);
        autoPlayTimer = null;
    }
}

function toggleSound() {
    soundEnabled = !soundEnabled;
    event.target.innerText = soundEnabled ? '🔊' : '🔇';
}

// СБРОС ПОДСВЕТКИ ЯЧЕЕК
function clearWinStyles() {
    cells.forEach(item => {
        item.element.style.borderColor = '#ffd700';
        item.element.style.background = '#ffffff';
    });
}

// ЗАПУСК ВРАЩЕНИЯ С ПОСЛЕДОВАТЕЛЬНОЙ ОСТАНОВКОЙ КОЛОНОК
function startSpin() {
    if (isSpinning) return;

    if (balance < totalBet) {
        alert('Недостаточно средств на балансе!');
        stopAutoPlay();
        return;
    }

    isSpinning = true;
    balance -= totalBet;
    clearWinStyles();
    updateUI();

    document.getElementById('win-msg').innerText = 'Крутим барабаны... 🎰';
    document.getElementById('win-msg').style.color = '#fff';

    // Генерируем финальную матрицу 3 ряда на 5 колонок
    const finalMatrix = [];
    const isWinner = Math.random() < 0.5; // 50% шанс на выигрыш
    const winSym = symbols[Math.floor(Math.random() * symbols.length)];

    for (let r = 0; r < 3; r++) {
        finalMatrix[r] = [];
        for (let c = 0; c < 5; c++) {
            finalMatrix[r][c] = symbols[Math.floor(Math.random() * symbols.length)];
        }
    }

    // Если выигрыш, делаем совпадение в центральном ряду (ряд 1) для первых 3-х колонок
    if (isWinner) {
        finalMatrix[1][0] = winSym;
        finalMatrix[1][1] = winSym;
        finalMatrix[1][2] = winSym;
    }

    // Запускаем анимацию кручения по колонкам (каждая колонка останавливается чуть позже)
    let columnsDone = 0;

    for (let col = 0; col < 5; col++) {
        let spinDuration = 400 + col * 300; // Колонка 0 крутится быстро, колонка 4 дольше всех
        
        let interval = setInterval(() => {
            for (let row = 0; row < 3; row++) {
                const randomSym = symbols[Math.floor(Math.random() * symbols.length)];
                document.getElementById(`cell-${row}-${col}`).innerText = randomSym;
                document.getElementById(`cell-${row}-${col}`).style.background = '#e6f2ff'; // Эффект размытия
            }
        }, 60);

        setTimeout(() => {
            clearInterval(interval);
            // Устанавливаем точные финальные символы для этой колонки
            for (let row = 0; row < 3; row++) {
                const cellDiv = document.getElementById(`cell-${row}-${col}`);
                cellDiv.innerText = finalMatrix[row][col];
                cellDiv.style.background = '#ffffff';
            }
            columnsDone++;

            if (columnsDone === 5) {
                checkWinCondition(finalMatrix);
            }
        }, spinDuration);
    }
}

// ПРОВЕРКА ВЫИГРЫША И ПОДСВЕТКА ЛИНИИ
function checkWinCondition(matrix) {
    let win = 0;
    // Проверяем центральную линию (ряд 1, колонки 0, 1, 2)
    if (matrix[1][0] === matrix[1][1] && matrix[1][1] === matrix[1][2]) {
        win = totalBet * (Math.floor(Math.random() * 4) + 2);
    }

    const msg = document.getElementById('win-msg');
    if (win > 0) {
        balance += win;
        msg.innerText = `🎉 ВЫИГРЫШ: +${win} 🪙 (ЛИНИЯ 1)`;
        msg.style.color = '#00ffcc';

        // Подсвечиваем выигрышные ячейки яркой рамкой (как на скриншоте линии)
        for (let c = 0; c < 3; c++) {
            const winningCell = document.getElementById(`cell-1-${c}`);
            winningCell.style.borderColor = '#00ffcc';
            winningCell.style.background = '#e0fdf5';
        }
    } else {
        msg.innerText = 'Повезет в следующий раз!';
        msg.style.color = '#ff5252';
    }

    updateUI();
    isSpinning = false;

    if (autoPlayActive) {
        if (balance >= totalBet) {
            autoPlayTimer = setTimeout(startSpin, 1400);
        } else {
            alert('Автоигра остановлена: недостаточно средств.');
            stopAutoPlay();
        }
    }
}

updateUI();
