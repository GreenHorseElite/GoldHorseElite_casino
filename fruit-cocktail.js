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
// Цвета линий как в оригинале (или любые на твой выбор для каждой из 9 линий)
const lineColors = [
    '#00ff00', // 1: Зеленая (верх)
    '#ffa500', // 2: Оранжевая (зигзаг)
    '#ff0000', // 3: Красная (центр)
    '#ffff00', // 4: Желтая (зигзаг)
    '#0000ff', // 5: Синяя (низ)
    '#ff00ff', // 6: Розовая (верхняя ломаная)
    '#ffffff', // 7: Белая (центр ломаная)
    '#00ffff', // 8: Голубая (нижняя ломаная)
    '#008000'  // 9: Темно-зеленая (низ ломаная)
];

// Функция отрисовки целой линии через все 5 барабанов
function drawWinningLines(winningLinesIndices) {
    const canvas = document.getElementById('lines-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Подгоняем размеры canvas под реальный размер сетки
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const cols = 5;
    const rows = 3;
    const cellWidth = canvas.width / cols;
    const cellHeight = canvas.height / rows;

    winningLinesIndices.forEach(lineIdx => {
        const lineRows = linesMap[lineIdx];
        ctx.beginPath();
        ctx.strokeStyle = lineColors[lineIdx % lineColors.length];
        ctx.lineWidth = 4;
        ctx.shadowBlur = 10;
        ctx.shadowColor = ctx.strokeStyle; // Эффект неонового свечения линии

        for (let c = 0; c < cols; c++) {
            let r = lineRows[c];
            // Центр ячейки по X и Y
            let x = c * cellWidth + cellWidth / 2;
            let y = r * cellHeight + cellHeight / 2;

            if (c === 0) {
                ctx.moveTo(x, y);
            } else {
                // Делаем плавные углы или прямые отрезки по точкам
                ctx.lineTo(x, y);
            }
        }
        ctx.stroke();
    });
}

// Очистка линий при следующем спине
function clearLinesCanvas() {
    const canvas = document.getElementById('lines-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Убираем старые стили с ячеек (если остались от прошлой версии)
    for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 5; c++) {
            const cell = document.getElementById(`cell-${r}-${c}`);
            if (cell) {
                cell.style.borderColor = '';
                cell.style.background = '';
            }
        }
    }
}

function evaluateLines(matrix) {
    let totalWin = 0;
    const betPerLine = totalBet / activeLines;
    const winningLinesIndices = []; // Список индексов линий, которые выиграли

    clearLinesCanvas(); // Стираем старые линии перед новой оценкой

    // Проверяем каждую активную линию
    for (let l = 0; l < activeLines; l++) {
        const lineRows = linesMap[l];
        
        const symbolsLeftToRight = [];
        const coordsLeftToRight = [];
        for (let c = 0; c < 5; c++) {
            let r = lineRows[c];
            symbolsLeftToRight.push(matrix[r][c]);
            coordsLeftToRight.push({ row: r, col: c });
        }

        function checkDirection(syms) {
            let targetSymbol = null;
            let matchCount = 0;

            for (let i = 0; i < syms.length; i++) {
                let current = syms[i];
                if (current === '🍓') break; // Бонусные символы по линиям не играют

                if (targetSymbol === null) {
                    if (current === '🟦') {
                        matchCount++;
                    } else {
                        targetSymbol = current;
                        matchCount++;
                    }
                } else {
                    if (current === targetSymbol || current === '🟦') {
                        matchCount++;
                    } else {
                        break;
                    }
                }
            }
            if (targetSymbol === null && matchCount > 0) targetSymbol = '🟦';

            if (matchCount >= 3 && targetSymbol && payTable[targetSymbol]) {
                return { count: matchCount, symbol: targetSymbol };
            }
            return null;
        }

        // Проверяем слева направо
        let winL2R = checkDirection(symbolsLeftToRight);
        let isWinningLine = false;

        if (winL2R) {
            let multiplier = payTable[winL2R.symbol][winL2R.count] || 0;
            totalWin += betPerLine * (multiplier / 10);
            isWinningLine = true;
        } else {
            // Проверяем справа налево
            let symbolsRightToLeft = [...symbolsLeftToRight].reverse();
            let winR2L = checkDirection(symbolsRightToLeft);
            if (winR2L) {
                let multiplier = payTable[winR2L.symbol][winR2L.count] || 0;
                totalWin += betPerLine * (multiplier / 10);
                isWinningLine = true;
            }
        }

        if (isWinningLine) {
            winningLinesIndices.push(l); // Запоминаем индекс выигравшей линии
        }
    }

    const msg = document.getElementById('win-msg');
    if (totalWin > 0) {
        balance += Math.round(totalWin);
        msg.innerText = `🎉 ВЫИГРЫШ: +${Math.round(totalWin)} 🪙`;
        msg.style.color = '#00ffcc';

        // Рисуем линии поверх барабанов на Canvas
        drawWinningLines(winningLinesIndices);
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
