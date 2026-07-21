const UI_COLORS = { "OPEN": "#fef08a", "PROCESS": "#86efac", "DEPLOY": "#bae6fd", "DONE": "#67e8f9", "REJECT": "#fca5a5", "CLOSE": "#e2e8f0", "PENDING": "#fecaca", "PILOT": "#fed7aa", "REOPEN": "#ffedd5" };

window.ganttInit = async function() {
    const GAS_URL = "https://script.google.com/macros/s/AKfycbx-bOq4FKPXui0au2kL1hHuyWagTv1hPVP_BybDHgPJw6w95rLDSp0-wN-Faa2JHwhv/exec"; // THAY URL CỦA BẠN VÀO ĐÂY
    window.gMonthOff = 0;
    
    try {
        const res = await fetch(`${GAS_URL}?t=${Date.now()}`);
        const raw = await res.json();
        // PHÂN LOẠI DỮ LIỆU ĐỂ FILTER
        window.gData = raw.map(r => {
            let type = 'project';
            if (r[0] && r[0].toString().trim() !== "") type = 'detail';
            else if (r[1] && r[1].toString().trim() !== "") type = 'task';
            return { 
                detailId: r[0], taskId: r[1], projectId: r[2], desc: r[3], pic: r[4], 
                from: r[5], to: r[6], status: (r[7]||"Open").toUpperCase(), 
                project: r[8], group: r[9], team: r[10], type: type 
            };
        });
        renderGanttV25();
    } catch (e) { console.error("Lỗi nạp dữ liệu:", e); }

    document.getElementById('btnAddG').onclick = () => {
        const id = "P" + (window.gData.filter(x=>x.type==='project').length + 1);
        window.gData.push({ projectId: id, desc: "Dự án mới", pic: "Linh", from: "2026-08-01", to: "2026-08-10", status: "OPEN", type:"project", project: "Unilever", group: "Group 1", team: "Ms Giang" });
        renderGanttV25();
    };
    document.getElementById('btnSyncG').onclick = () => syncGanttV25(GAS_URL);
};

function renderGanttV25() {
    const bLeft = document.getElementById('bodyLeft'), bRight = document.getElementById('bodyRight'), hRight = document.getElementById('headRight');
    if (!bLeft || !bRight) return;

    const today = new Date();
    const startM = new Date(today.getFullYear(), today.getMonth() + window.gMonthOff, 1);
    const endM = new Date(startM.getFullYear(), startM.getMonth() + 1, 0);
    const daysCount = endM.getDate();
    startM.setHours(0,0,0,0);

    document.getElementById('txtMonth').innerText = `THÁNG ${startM.getMonth()+1} / ${startM.getFullYear()}`;

    // Vẽ Header Timeline
    hRight.innerHTML = `<tr><th colspan="${daysCount}">TIMELINE GANTT CHART (18px/Day)</th></tr><tr>` + Array.from({length: daysCount}, (_, i) => `<th class="day-col">${i+1}</th>`).join('') + `</tr>`;

    const fP = document.getElementById('fP').checked, fT = document.getElementById('fT').checked, fD = document.getElementById('fD').checked;
    let htmlL = "", htmlR = "";

    window.gData.forEach((item, idx) => {
        // BỘ LỌC
        if (item.type === 'project' && !fP) return;
        if (item.type === 'task' && !fT) return;
        if (item.type === 'detail' && !fD) return;
        
        const indent = item.type==='task'?'ind-1':(item.type==='detail'?'ind-2':'');
        const btnT = (item.type === 'project') ? `<button onclick="window.addT('${item.projectId}')" class="btn-plus">+T</button>` : '';
        const btnD = (item.type === 'task') ? `<button onclick="window.addD('${item.taskId}')" class="btn-plus" style="background:#8b5cf6">+D</button>` : '';
        
        // BẢNG TRÁI: DỮ LIỆU
        htmlL += `<tr>
            <td class="w-dtl">${item.detailId || btnD}</td><td class="w-tsk">${item.taskId || btnT}</td><td class="w-id">${item.projectId}</td>
            <td contenteditable="true" onblur="upG(${idx},'desc',this)" class="col-desc ${indent}">${item.desc}</td>
            <td contenteditable="true" onblur="upG(${idx},'pic',this)" class="w-pic">${item.pic || ''}</td>
            <td contenteditable="true" onblur="upG(${idx},'from',this)" class="w-date">${fixDateV25(item.from)}</td>
            <td contenteditable="true" onblur="upG(${idx},'to',this)" class="w-date">${fixDateV25(item.to)}</td>
            <td class="w-stt"><span class="st-badge" style="background:${UI_COLORS[item.status]||'#eee'}" contenteditable="true" onblur="upG(${idx},'status',this)">${item.status}</span></td>
            <td class="w-prj">${item.project || ''}</td>
            <td class="w-grp" contenteditable="true" onblur="upG(${idx},'group',this)">${item.group || ''}</td>
            <td class="w-tem" contenteditable="true" onblur="upG(${idx},'team',this)">${item.team || ''}</td>
        </tr>`;

        // BẢNG PHẢI: GANTT BAR
        const dS = new Date(fixDateV25(item.from)); const dE = new Date(fixDateV25(item.to));
        dS.setHours(0,0,0,0); dE.setHours(0,0,0,0);
        const clipS = dS < startM ? startM : dS; const clipE = dE > endM ? endM : dE;
        let startIdx = -1, dur = 0;
        if (clipS <= clipE && clipE >= startM && clipS <= endM) {
            startIdx = Math.floor((clipS - startM) / 86400000);
            dur = Math.floor((clipE - clipS) / 86400000) + 1;
        }
        let cells = "";
        for(let i=0; i<daysCount; i++) {
            let bar = (i === startIdx) ? `<div class="gt-bar" style="background:${UI_COLORS[item.status]||'#cbd5e1'}; width:${dur*18-2}px"></div>` : "";
            cells += `<td class="day-col" style="position:relative; overflow:visible">${bar}</td>`;
        }
        htmlR += `<tr>${cells}</tr>`;
    });

    bLeft.innerHTML = htmlL;
    bRight.innerHTML = htmlR;
}

function fixDateV25(s) { if(!s) return ""; let c = s.toString().split('T')[0]; let d = new Date(c); return isNaN(d.getTime()) ? s : `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }

window.upG = (i, f, el) => { 
    window.gData[i][f] = el.innerText.trim(); 
    if(f==='status') window.gData[i][f] = window.gData[i][f].toUpperCase();
    if(['status','from','to'].includes(f)) renderGanttV25(); 
};

window.changeGanttMonth = (n) => { window.gMonthOff += n; renderGanttV25(); };

window.addT = (pid) => {
    const p = window.gData.find(x => x.projectId === pid && x.type === 'project');
    const c = window.gData.filter(x => x.projectId === pid && x.type === 'task').length + 1;
    const idx = window.gData.findLastIndex(x => x.projectId === pid);
    window.gData.splice(idx+1, 0, {...p, type: 'task', taskId: pid+"_T"+c, detailId:"", desc: "Task mới"});
    renderGanttV25();
};

window.addD = (tid) => {
    const p = window.gData.find(x => x.taskId === tid && x.type === 'task');
    const c = window.gData.filter(x => x.taskId === tid && x.type === 'detail').length + 1;
    const idx = window.gData.findLastIndex(x => x.taskId === tid);
    window.gData.splice(idx+1, 0, {...p, type: 'detail', detailId: tid+"_D"+c, desc: "Detail mới"});
    renderGanttV25();
};

async function syncGanttV25(url) {
    if (prompt("Mật khẩu SYNC:") !== "LINHVTsync") return alert("Wrong!");
    const btn = document.getElementById('btnSyncG'); btn.innerText = "Syncing...";
    // CHUẨN BỊ ĐÚNG 11 CỘT ĐỂ GỬI LÊN GS
    const cleanData = window.gData.map(d => ({
        detailId: d.detailId||"", taskId: d.taskId||"", projectId: d.projectId||"", desc: d.desc||"", pic: d.pic||"", from: d.from||"", to: d.to||"", status: d.status||"Open", project: d.project||"", group: d.group||"", team: d.team||""
    }));
    try {
        await fetch(url, { method: "POST", mode: 'no-cors', body: JSON.stringify({ type: "UPDATE_ALL", data: cleanData }) });
        alert("Thành công! Google Sheet đã được cập nhật.");
    } catch (e) { alert("Lỗi kết nối!"); }
    btn.innerText = "Sync Google Sheets";
}

window.ganttInit();