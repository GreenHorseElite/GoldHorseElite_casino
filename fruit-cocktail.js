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

// Генерация сетки 5х3
const gridElement = document.getElementById('slot-grid');
for (let i = 0; i < 15; i++) {
    const cell = document.createElement('div');
    cell.className = 'slot-cell';
    cell.id = `cell-${i}`;
    cell.innerText = symbols[i % symbols.length];
    gridElement.appendChild(cell);
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

function startSpin() {
    if (isSpinning) return;

    if (balance < totalBet) {
        alert('Недостаточно средств на балансе!');
        stopAutoPlay();
        return;
    }

    isSpinning = true;
    balance -= totalBet;
    updateUI();

    document.getElementById('win-msg').innerText = 'Крутим барабаны... 🎰';
    document.getElementById('win-msg').style.color = '#fff';

    let counter = 0;
    const spinInterval = setInterval(() => {
        for (let i = 0; i < 15; i++) {
            const randomSym = symbols[Math.floor(Math.random() * symbols.length)];
            document.getElementById(`cell-${i}`).innerText = randomSym;
        }
        counter++;

        if (counter > 10) {
            clearInterval(spinInterval);
            finalizeSpin();
        }
    }, 50);
}

function finalizeSpin() {
    const finalIcons = [];
    const isWinner = Math.random() < 0.45;
    
    if (isWinner) {
        const winSym = symbols[Math.floor(Math.random() * symbols.length)];
        for (let i = 0; i < 15; i++) {
            finalIcons.push(symbols[Math.floor(Math.random() * symbols.length)]);
        }
        finalIcons[5] = winSym;
        finalIcons[6] = winSym;
        finalIcons[7] = winSym;
    } else {
        for (let i = 0; i < 15; i++) {
            finalIcons.push(symbols[Math.floor(Math.random() * symbols.length)]);
        }
    }

    for (let i = 0; i < 15; i++) {
        document.getElementById(`cell-${i}`).innerText = finalIcons[i];
    }

    let win = 0;
    if (finalIcons[5] === finalIcons[6] && finalIcons[6] === finalIcons[7]) {
        win = totalBet * (Math.floor(Math.random() * 3) + 2);
    }

    const msg = document.getElementById('win-msg');
    if (win > 0) {
        balance += win;
        msg.innerText = `🎉 ВЫИГРЫШ: +${win} 🪙`;
        msg.style.color = '#00ffcc';
    } else {
        msg.innerText = 'Повезет в следующий раз!';
        msg.style.color = '#ff5252';
    }

    updateUI();
    isSpinning = false;

    if (autoPlayActive) {
        if (balance >= totalBet) {
            autoPlayTimer = setTimeout(startSpin, 1200);
        } else {
            alert('Автоигра остановлена: недостаточно средств.');
            stopAutoPlay();
        }
    }
}

updateUI();
