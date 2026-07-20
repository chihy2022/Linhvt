const COLORS = {
    "Open": "#ffff00", "Process": "#00ff00", "Deploy": "#c9daf8", "Pilot": "#ff9900",
    "Done": "#00ffff", "Close": "#ead1dc", "Reopen": "#fff2cc", "Pending": "#f4cccc", "Reject": "#ea9999"
};

let database = [];
let rangeOffset = 0;
const colWidth = 25; 

window.veBang = function() {
    const sP = document.getElementById('chkP').checked;
    const sT = document.getElementById('chkT').checked;
    const sD = document.getElementById('chkD').checked;

    // Tính toán khung thời gian hiển thị (tháng hiện tại)
    const today = new Date();
    const startRange = new Date(today.getFullYear(), today.getMonth() + rangeOffset, 1);
    const endRange = new Date(startRange.getFullYear(), startRange.getMonth() + 1, 0);
    const totalDays = endRange.getDate();

    document.getElementById('labelThang').textContent = `Tháng ${startRange.getMonth()+1}/${startRange.getFullYear()}`;

    // Header Ngày
    const vungNgay = document.getElementById('vungNgay');
    let hNgay = `<tr><th colspan="${totalDays}" style="background:#eee">Tháng ${startRange.getMonth()+1}</th></tr><tr>`;
    for(let i=1; i<=totalDays; i++) hNgay += `<th class="day-cell">${i<10?'0'+i:i}</th>`;
    vungNgay.innerHTML = hNgay + "</tr>";

    const vungDuLieu = document.getElementById('vungDuLieu');
    const vungGantt = document.getElementById('vungGantt');
    vungDuLieu.innerHTML = ""; vungGantt.innerHTML = "";

    database.forEach((item, index) => {
        if (item.type === 'project' && !sP) return;
        if (item.type === 'task' && !sT) return;
        if (item.type === 'detail' && !sD) return;

        // Vẽ cột trái
        const trD = document.createElement('tr');
        trD.innerHTML = `
            <td>${item.type==='detail' ? item.detailId : (item.type==='task' ? `<button onclick="window.themDetail('${item.taskId}')" class="btn-plus" style="background:#6f42c1">+D</button>` : '')}</td>
            <td>${item.type!=='project' ? item.taskId : `<button onclick="window.themTask('${item.projectId}')" class="btn-plus" style="background:#007bff">+T</button>`}</td>
            <td style="font-weight:bold">${item.projectId}</td>
            <td><input type="text" value="${item.desc}" oninput="window.update(${index},'desc',this.value)"></td>
            <td><select onchange="window.update(${index},'pic',this.value)"><option ${item.pic==='Linh'?'selected':''}>Linh</option><option ${item.pic==='Kiệt'?'selected':''}>Kiệt</option></select></td>
            <td><input type="date" value="${item.from}" onchange="window.update(${index},'from',this.value)"></td>
            <td><input type="date" value="${item.to}" onchange="window.update(${index},'to',this.value)"></td>
            <td style="background:${COLORS[item.status]}">${taoSelectStatus(item.status, index)}</td>
            <td>Unilever</td><td>Group 1</td>
        `;
        vungDuLieu.appendChild(trD);

        // Vẽ Gantt (Xử lý xuyên tháng)
        const trG = document.createElement('tr');
        for (let i = 0; i < totalDays; i++) trG.innerHTML += `<td class="day-cell"></td>`;
        
        if (item.from && item.to) {
            const dS = new Date(item.from + "T00:00:00"); 
            const dE = new Date(item.to + "T00:00:00");
            
            // Logic Clipping: Cắt ngày dự án theo khung nhìn của tháng
            const clipStart = dS < startRange ? startRange : dS;
            const clipEnd = dE > endRange ? endRange : dE;

            if (clipStart <= clipEnd) {
                // Tính vị trí bắt đầu (index ngày 0 -> 30)
                const startIdx = Math.floor((clipStart - startRange) / (1000 * 60 * 60 * 24));
                // Tính số ngày hiển thị trong tháng này
                const duration = Math.floor((clipEnd - clipStart) / (1000 * 60 * 60 * 24)) + 1;
                
                const bar = document.createElement('div');
                bar.className = "bar";
                bar.style.backgroundColor = COLORS[item.status] || "#ccc";
                bar.style.left = (startIdx * colWidth) + "px";
                bar.style.width = (duration * colWidth) + "px";
                
                trG.cells[0].appendChild(bar);
            }
        }
        vungGantt.appendChild(trG);
    });
};

function taoSelectStatus(current, idx) {
    let h = `<select onchange="window.update(${idx},'status',this.value)">`;
    Object.keys(COLORS).forEach(s => h += `<option value="${s}" ${s===current?'selected':''}>${s}</option>`);
    return h + `</select>`;
}

window.doiThang = (n) => { rangeOffset += n; window.veBang(); };
window.update = (idx, f, v) => { database[idx][f] = v; window.veBang(); };

window.themDuAn = () => {
    const id = "P" + (database.filter(x => x.type === 'project').length + 1);
    const d = new Date();
    const fromStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`;
    const toStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-10`;
    database.push({ projectId: id, taskId: '', detailId: '', type: 'project', desc: 'Dự án mới', pic: 'Linh', from: fromStr, to: toStr, status: 'Open' });
    window.veBang();
};

window.themTask = (pid) => {
    const p = database.find(x => x.projectId === pid);
    const count = database.filter(x => x.projectId === pid && x.type === 'task').length + 1;
    const idx = database.map(x => x.projectId).lastIndexOf(pid);
    database.splice(idx + 1, 0, { ...p, type: 'task', taskId: pid + "_T" + count, desc: 'Task mới' });
    window.veBang();
};

window.themDetail = (tid) => {
    const t = database.find(x => x.taskId === tid);
    const count = database.filter(x => x.taskId === tid && x.type === 'detail').length + 1;
    const idx = database.map(x => x.taskId).lastIndexOf(tid);
    database.splice(idx + 1, 0, { ...t, type: 'detail', detailId: tid + "_D" + count, desc: 'Detail mới' });
    window.veBang();
};

setTimeout(() => { if(document.getElementById('vungDuLieu')) window.themDuAn(); }, 300);