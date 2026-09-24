const tg = window.Telegram.WebApp;
tg.expand();

let balance = localStorage.getItem('slot_balance') ? parseInt(localStorage.getItem('slot_balance')) : 11795;
let totalBet = 90;
let activeLines = 9;
let isSpinning = false;
let autoPlayActive = false;
let autoPlayTimer = null;
let soundEnabled = true;
let currentHelpPage = 1;

// Символы: 🍓(клубника - бонус), 🍉(арбуз), 🍐(груша), 🍎(яблоко), 🍋(лимон), 🍑(персик), 🍒(вишня), 🟦(коктейль - вайлд)
const symbols = ['🍓', '🍉', '🍐', '🍎', '🍋', '🍑', '🍒', '🟦'];

// Коэффициенты выплат за 3, 4, 5 символов в линии
const payTable = {
    '🟦': { 3: 100, 4: 500, 5: 2000 }, // Коктейль (Wild)
    '🍉': { 3: 20,  4: 100, 5: 500  }, // Арбуз
    '🍐': { 3: 10,  4: 50,  5: 200  }, // Груша
    '🍎': { 3: 5,   4: 20,  5: 100  }, // Яблоко
    '🍋': { 3: 5,   4: 10,  5: 50   }, // Лимон
    '🍑': { 3: 3,   4: 5,   5: 20   }, // Персик
    '🍒': { 3: 2,   4: 3,   5: 10   }  // Вишня
};

// 9 классических линий выплат (индексы строк 0, 1, 2 для колонок 0..4)
const linesMap = [
    [1, 1, 1, 1, 1], // Линия 1: центр
    [0, 0, 0, 0, 0], // Линия 2: верх
    [2, 2, 2, 2, 2], // Линия 3: низ
    [0, 1, 2, 1, 0], // Линия 4: V-образная
    [2, 1, 0, 1, 2], // Линия 5: Λ-образная
    [0, 0, 1, 2, 2], // Линия 6
    [2, 2, 1, 0, 0], // Линия 7
    [1, 0, 1, 0, 1], // Линия 8
    [1, 2, 1, 2, 1]  // Линия 9
];

// Генерация сетки 5х3
const gridElement = document.getElementById('slot-grid');
const cells = [];

for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 5; c++) {
        const cell = document.createElement('div');
        cell.className = 'slot-cell';
        cell.id = `cell-${r}-${c}`;
        cell.innerText = symbols[(r + c) % 7];
        gridElement.appendChild(cell);
        cells.push({ row: r, col: c, element: cell });
    }
}

// Кнопки линий
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

// УПРАВЛЕНИЕ СПРАВКОЙ (ЛИСТЫ 1 - 5)
function openHelp() {
    if (isSpinning) return;
    currentHelpPage = 1;
    renderHelpPage();
    document.getElementById('help-modal-overlay').style.display = 'flex';
}

function closeHelp() {
    document.getElementById('help-modal-overlay').style.display = 'none';
}

function nextHelpPage() {
    currentHelpPage = currentHelpPage < 5 ? currentHelpPage + 1 : 1;
    renderHelpPage();
}

function prevHelpPage() {
    currentHelpPage = currentHelpPage > 1 ? currentHelpPage - 1 : 5;
    renderHelpPage();
}

function renderHelpPage() {
    document.getElementById('help-title').innerText = `ЛИСТ ${currentHelpPage}`;
    const content = document.getElementById('help-content');
    
    if (currentHelpPage === 1) {
        content.innerHTML = `
            <b>ВЫИГРЫШ ДО 125 000 КРЕДИТОВ</b><br><br>
            • Ставка от 10 до 900 кредитов.<br>
            • Игра по 9 линиям и до 100 кредитов на линию.<br>
            • Все выигрыши по линиям суммируются.<br>
            • Символ 🟦 (Фруктовый Коктейль) заменяет любой символ.<br>
            <hr style="border-color:#333; margin:8px 0;">
            <b>Схемы линий выплат:</b> Игра задействует активные линии от 1 до 9.
        `;
    } else if (currentHelpPage === 2) {
        content.innerHTML = `
            <b>ТАБЛИЦА ВЫПЛАТ (Часть 1)</b>
            <table class="help-table">
                <tr><td>🟦 🟦 🟦</td><td>100 кредитов</td></tr>
                <tr><td>🟦 🟦 🟦 🟦</td><td>500 кредитов</td></tr>
                <tr><td>🟦 🟦 🟦 🟦 🟦</td><td>2000 кредитов</td></tr>
                <tr><td>🍉 🍉 🍉</td><td>20 кр. (500 макс)</td></tr>
                <tr><td>🍐 🍐 🍐</td><td>10 кр. (200 макс)</td></tr>
            </table>
        `;
    } else if (currentHelpPage === 3) {
        content.innerHTML = `
            <b>ТАБЛИЦА ВЫПЛАТ (Часть 2)</b>
            <table class="help-table">
                <tr><td>🍎 🍎 🍎</td><td>5 кр. (100 макс)</td></tr>
                <tr><td>🍋 🍋 🍋</td><td>5 кр. (50 макс)</td></tr>
                <tr><td>🍑 🍑 🍑</td><td>3 кр. (20 макс)</td></tr>
                <tr><td>🍒 🍒 🍒</td><td>2 кр. (10 макс)</td></tr>
            </table>
        `;
    } else if (currentHelpPage === 4) {
        content.innerHTML = `
            <b>РИСК-ИГРА С КАРТАМИ</b><br><br>
            • Если в главной игре выпал выигрыш, можно сыграть на риск.<br>
            • Откройте одну из четырех карт.<br>
            • Если ваша карта старше карты дилера — выигрыш удваивается!<br>
            • Равна — возврат, меньше — проигрыш.
        `;
    } else if (currentHelpPage === 5) {
        content.innerHTML = `
            <b>ПРИЗОВАЯ ИГРА (КЛУБНИЧКИ)</b><br><br>
            • Выпадение 3 символов 🍓 — 1 призовая игра.<br>
            • 4 символа — 2 игры.<br>
            • 5 символов — 3 игры.<br>
            Собирайте призы по линиям светящихся символов!
        `;
    }
}

// СБРОС ПОДСВЕТКИ ЯЧЕЕК
function clearWinStyles() {
    cells.forEach(item => {
        item.element.style.borderColor = '#ffd700';
        item.element.style.background = '#ffffff';
    });
}

// ЗАПУСК ВРАЩЕНИЯ С ПРОВЕРКОЙ 9 ЛИНИЙ
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

    const finalMatrix = [];
    for (let r = 0; r < 3; r++) {
        finalMatrix[r] = [];
        for (let c = 0; c < 5; c++) {
            // Вероятность выпадения клубники меньше, остальных символов — равная
            const randIdx = Math.random() < 0.08 ? 0 : Math.floor(Math.random() * (symbols.length - 1)) + 1;
            finalMatrix[r][c] = symbols[randIdx];
        }
    }

    let columnsDone = 0;
    for (let col = 0; col < 5; col++) {
        let spinDuration = 400 + col * 250;
        
        let interval = setInterval(() => {
            for (let row = 0; row < 3; row++) {
                const randomSym = symbols[Math.floor(Math.random() * (symbols.length - 1)) + 1];
                document.getElementById(`cell-${row}-${col}`).innerText = randomSym;
                document.getElementById(`cell-${row}-${col}`).style.background = '#e6f2ff';
            }
        }, 50);

        setTimeout(() => {
            clearInterval(interval);
            for (let row = 0; row < 3; row++) {
                const cellDiv = document.getElementById(`cell-${row}-${col}`);
                cellDiv.innerText = finalMatrix[row][col];
                cellDiv.style.background = '#ffffff';
            }
            columnsDone++;

            if (columnsDone === 5) {
                evaluateLines(finalMatrix);
            }
        }, spinDuration);
    }
}

// ИСПРАВЛЕННЫЙ АЛГОРИТМ ПРОВЕРКИ ЛИНИЙ (В ОБЕ СТОРОНЫ + WILD)
function evaluateLines(matrix) {
    let totalWin = 0;
    const betPerLine = totalBet / activeLines;
    const winningCellsToHighlight = new Set();

    // Проверяем каждую активную линию
    for (let l = 0; l < activeLines; l++) {
        const lineRows = linesMap[l];
        
        // Собираем символы линии слева направо
        const symbolsLeftToRight = [];
        const coordsLeftToRight = [];
        for (let c = 0; c < 5; c++) {
            let r = lineRows[c];
            symbolsLeftToRight.push(matrix[r][c]);
            coordsLeftToRight.push({ row: r, col: c });
        }

        // Функция для подсчета совпадений в массиве символов
        function checkDirection(syms, coords) {
            let targetSymbol = null;
            let matchCount = 0;
            let currentWinningCoords = [];

            for (let i = 0; i < syms.length; i++) {
                let current = syms[i];

                if (current === '🍓') break; // Бонусные символы по линиям не играют (только скаттеры от 3х штук)

                if (targetSymbol === null) {
                    if (current === '🟦') {
                        // Если начали с вайлда, ждем конкретный символ дальше
                        matchCount++;
                        currentWinningCoords.push(coords[i]);
                    } else {
                        targetSymbol = current;
                        matchCount++;
                        currentWinningCoords.push(coords[i]);
                    }
                } else {
                    if (current === targetSymbol || current === '🟦') {
                        matchCount++;
                        currentWinningCoords.push(coords[i]);
                    } else {
                        break; // Цепочка прервалась
                    }
                }
            }

            // Если первый был вайлд, а дальше шли только вайлды
            if (targetSymbol === null && matchCount > 0) {
                targetSymbol = '🟦';
            }

            if (matchCount >= 3 && targetSymbol && payTable[targetSymbol]) {
                return { count: matchCount, symbol: targetSymbol, coords: currentWinningCoords };
            }
            return null;
        }

        // 1. Проверяем слева направо
        let winL2R = checkDirection(symbolsLeftToRight, coordsLeftToRight);
        if (winL2R) {
            let multiplier = payTable[winL2R.symbol][winL2R.count] || 0;
            let lineWin = betPerLine * (multiplier / 10);
            totalWin += lineWin;
            winL2R.coords.forEach(pos => winningCellsToHighlight.add(`${pos.row}-${pos.col}`));
        }

        // 2. Проверяем справа налево (переворачиваем массивы)
        let symbolsRightToLeft = [...symbolsLeftToRight].reverse();
        let coordsRightToLeft = [...coordsLeftToRight].reverse();
        let winR2L = checkDirection(symbolsRightToLeft, coordsRightToLeft);
        
        // Засчитываем справа налево только если слева направо не было выигрыша по этой же линии, 
        // чтобы избежать двойного начисления за 5 одинаковых символов в центре
        if (winR2L && !winL2R) {
            let multiplier = payTable[winR2L.symbol][winR2L.count] || 0;
            let lineWin = betPerLine * (multiplier / 10);
            totalWin += lineWin;
            winR2L.coords.forEach(pos => winningCellsToHighlight.add(`${pos.row}-${pos.col}`));
        }
    }

    const msg = document.getElementById('win-msg');
    if (totalWin > 0) {
        balance += Math.round(totalWin);
        msg.innerText = `🎉 ВЫИГРЫШ: +${Math.round(totalWin)} 🪙`;
        msg.style.color = '#00ffcc';

        // Подсвечиваем все выигрышные ячейки
        winningCellsToHighlight.forEach(cellKey => {
            let [r, c] = cellKey.split('-');
            const cell = document.getElementById(`cell-${r}-${c}`);
            if (cell) {
                cell.style.borderColor = '#00ffcc';
                cell.style.background = '#e0fdf5';
            }
        });
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
