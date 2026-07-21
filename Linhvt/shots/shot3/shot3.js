// 1. CẤU HÌNH MÀU SẮC & LINK API
const COLORS_V37 = { 
    "OPEN": "#fef08a", "PROCESS": "#86efac", "DEPLOY": "#bae6fd", 
    "DONE": "#67e8f9", "REJECT": "#fca5a5", "CLOSE": "#e2e8f0", 
    "PENDING": "#fecaca", "PILOT": "#fed7aa", "REOPEN": "#ffedd5" 
};

// URL App Script của bạn
const GAS_API = "https://script.google.com/macros/s/AKfycby3QH3NBi4_J7A8IJuEEfU3k5O8SCtS-yVSp1-rUwtPM4qijVXy_0tjAbMix2Vj1R8x/exec";

window.ganttInit = async function() {
    window.gMonthOff = 0; // Biến điều hướng tháng
    try {
        const res = await fetch(`${GAS_API}?t=${Date.now()}`);
        const raw = await res.json();
        
        // Phân loại dữ liệu (Project/Task/Detail) dựa trên việc có ID ở cột A hay B không
        window.gData = raw.map(r => {
            let type = 'project';
            if (r[0] && r[0].toString().trim() !== "") type = 'detail';
            else if (r[1] && r[1].toString().trim() !== "") type = 'task';
            
            return { 
                detail: r[0], task: r[1], id: r[2], desc: r[3], pic: r[4], 
                from: r[5], to: r[6], status: (r[7]||"Open").toUpperCase(), 
                project: r[8], group: r[9], team: r[10], type: type 
            };
        });
        
        renderGanttV37(); // Gọi hàm vẽ bảng
    } catch (e) { 
        console.error("Lỗi nạp dữ liệu:", e); 
        alert("Không thể tải dữ liệu từ Google Sheet. Hãy kiểm tra kết nối mạng.");
    }

    // Gán sự kiện cho nút Thêm Dự Án
    const btnAdd = document.getElementById('btnAddG');
    if (btnAdd) {
        btnAdd.onclick = () => {
            const newId = "P" + (window.gData.filter(x => x.type === 'project').length + 1);
            window.gData.push({ 
                id: newId, task: "", detail: "", desc: "Dự án mới", pic: "Linh", 
                from: "2026-08-01", to: "2026-08-10", status: "OPEN", 
                type: "project", project: "Unilever", group: "Group 1", team: "Ms Giang" 
            });
            renderGanttV37();
        };
    }

    // Gán sự kiện cho nút Sync
    const btnSync = document.getElementById('btnSyncG');
    if (btnSync) btnSync.onclick = () => syncGanttV37();
};

// 2. HÀM VẼ GIAO DIỆN CHÍNH (QUAN TRỌNG NHẤT)
function renderGanttV37() {
    const bLeft = document.getElementById('bodyLeft');
    const bRight = document.getElementById('bodyRight');
    const hRight = document.getElementById('headRight');
    const txtMonth = document.getElementById('txtMonth');
    
    if (!bLeft || !bRight || !hRight) {
        console.error("Không tìm thấy các ID HTML: bodyLeft, bodyRight hoặc headRight");
        return;
    }

    const today = new Date();
    const startM = new Date(today.getFullYear(), today.getMonth() + window.gMonthOff, 1);
    const endM = new Date(startM.getFullYear(), startM.getMonth() + 1, 0);
    const daysCount = endM.getDate();
    startM.setHours(0,0,0,0);

    if (txtMonth) txtMonth.innerText = `THÁNG ${startM.getMonth()+1} / ${startM.getFullYear()}`;

    // Header Timeline
    hRight.innerHTML = `<tr><th colspan="${daysCount}" class="gt-super-head">TIMELINE GANTT CHART</th></tr><tr>` + 
        Array.from({length: daysCount}, (_, i) => `<th class="day-col">${i+1}</th>`).join('') + `</tr>`;

    // Bộ lọc checkbox
    const fP = document.getElementById('fP')?.checked ?? true;
    const fT = document.getElementById('fT')?.checked ?? true;
    const fD = document.getElementById('fD')?.checked ?? true;

    let htmlL = "", htmlR = "";

    window.gData.forEach((item, idx) => {
        // Lọc dữ liệu
        if (item.type === 'project' && !fP) return;
        if (item.type === 'task' && !fT) return;
        if (item.type === 'detail' && !fD) return;

        const indent = item.type === 'task' ? 'ind-1' : (item.type === 'detail' ? 'ind-2' : '');
        const btnT = (item.type === 'project') ? `<button onclick="window.addT37('${item.id}')" class="btn-plus">+T</button>` : '';
        const btnD = (item.type === 'task') ? `<button onclick="window.addD37('${item.task}')" class="btn-plus" style="background:#8b5cf6">+D</button>` : '';

        // Bảng trái
        htmlL += `<tr>
            <td style="text-align:center">${item.detail || btnD}</td>
            <td style="text-align:center">${item.task || btnT}</td>
            <td style="text-align:center; font-weight:700">${item.id}</td>
            <td contenteditable="true" onblur="upV37(${idx},'desc',this)" class="col-desc-flex ${indent}">${item.desc}</td>
            <td contenteditable="true" onblur="upV37(${idx},'pic',this)">${item.pic || ''}</td>
            <td contenteditable="true" onblur="upV37(${idx},'from',this)" style="text-align:center">${fixV37(item.from)}</td>
            <td contenteditable="true" onblur="upV37(${idx},'to',this)" style="text-align:center">${fixV37(item.to)}</td>
            <td style="text-align:center"><span class="st-badge" style="background:${COLORS_V37[item.status]||'#eee'}" contenteditable="true" onblur="upV37(${idx},'status',this)">${item.status}</span></td>
            <td contenteditable="true" onblur="upV37(${idx},'project',this)">${item.project || ''}</td>
            <td contenteditable="true" onblur="upV37(${idx},'group',this)">${item.group || ''}</td>
            <td contenteditable="true" onblur="upV37(${idx},'team',this)">${item.team || ''}</td>
        </tr>`;

        // Tính toán thanh Bar
        const dS = new Date(fixV37(item.from)); 
        const dE = new Date(fixV37(item.to));
        dS.setHours(0,0,0,0); dE.setHours(0,0,0,0);
        
        const clipS = dS < startM ? startM : dS;
        const clipE = dE > endM ? endM : dE;
        
        let startIdx = -1, dur = 0;
        if (clipS <= clipE && clipE >= startM && clipS <= endM) {
            startIdx = Math.floor((clipS - startM) / 86400000);
            dur = Math.floor((clipE - clipS) / 86400000) + 1;
        }

        let cells = "";
        for(let i=0; i<daysCount; i++) {
            let bar = (i === startIdx) ? `<div class="gt-bar" style="background:${COLORS_V37[item.status]||'#cbd5e1'}; width:${dur*18-2}px"></div>` : "";
            cells += `<td class="day-col gt-cell-rel">${bar}</td>`;
        }
        htmlR += `<tr>${cells}</tr>`;
    });

    bLeft.innerHTML = htmlL;
    bRight.innerHTML = htmlR;
}

// 3. CÁC HÀM TIỆN ÍCH & THAO TÁC
function fixV37(s) { 
    if(!s) return ""; 
    let c = s.toString().split('T')[0]; 
    let d = new Date(c); 
    return isNaN(d.getTime()) ? s : `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; 
}

window.upV37 = (i, f, el) => { 
    window.gData[i][f] = el.innerText.trim(); 
    if(f==='status') window.gData[i][f] = window.gData[i][f].toUpperCase(); 
    renderGanttV37(); 
};

window.changeMonthV37 = (n) => { 
    window.gMonthOff += n; 
    renderGanttV37(); 
};

window.addT37 = (pid) => {
    const p = window.gData.find(x => x.id === pid && x.type === 'project');
    const c = window.gData.filter(x => x.id === pid && x.type === 'task').length + 1;
    const idx = window.gData.findLastIndex(x => x.id === pid);
    window.gData.splice(idx+1, 0, {...p, type: 'task', task: pid+"_T"+c, detail:"", desc: "Task mới"});
    renderGanttV37();
};

window.addD37 = (tid) => {
    const p = window.gData.find(x => x.task === tid && x.type === 'task');
    const c = window.gData.filter(x => x.task === tid && x.type === 'detail').length + 1;
    const idx = window.gData.findLastIndex(x => x.task === tid);
    window.gData.splice(idx+1, 0, {...p, type: 'detail', detail: tid+"_D"+c, desc: "Detail mới"});
    renderGanttV37();
};

// 4. HÀM SYNC DỮ LIỆU CHUẨN
async function syncGanttV37() {
    const pass = prompt("Nhập mật khẩu SYNC (LINHVTsync):"); 
    if (pass !== "LINHVTsync") return alert("Sai mật khẩu!");
    
    const btn = document.getElementById('btnSyncG'); 
    btn.innerText = "⏳ Syncing...";
    btn.disabled = true;

    // Chuẩn bị dữ liệu gửi đi (Đúng 11 cột mà GAS mong đợi)
    const payload = window.gData.map(item => ({
        detail: item.detail || "",
        task: item.task || "",
        id: item.id || "",
        desc: item.desc || "",
        pic: item.pic || "",
        from: fixV37(item.from),
        to: fixV37(item.to),
        status: item.status || "OPEN",
        project: item.project || "",
        group: item.group || "",
        team: item.team || ""
    }));

    try {
        await fetch(GAS_API, { 
            method: "POST", 
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({ type: "UPDATE_ALL", data: payload }) 
        });
        alert("✅ Sync thành công! Dữ liệu đang được cập nhật lên Google Sheet.");
    } catch (e) { 
        alert("❌ Lỗi mạng: Không thể kết nối tới Google."); 
    } finally {
        btn.innerText = "Sync Google Sheets";
        btn.disabled = false;
    }
}

// Khởi chạy hệ thống
window.ganttInit();