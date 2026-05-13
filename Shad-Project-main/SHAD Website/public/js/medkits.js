const kitList = document.getElementById("kit-list");
const kitCount = document.getElementById("kit-count");
const addKitBtn = document.getElementById("addKitBtn");

let medKits = [
    {
        name: "Main Med Kit",
        staff: "Sarah Kim",
        location: "Lecture Hall",
        status: "Checked",
        supplies: "Fully stocked",
        checkedToday: true
    },
    {
        name: "Outdoor Med Pack",
        staff: "Jordan Lee",
        location: "Field Area",
        status: "Needs Restock",
        supplies: "Low on gloves and bandages",
        checkedToday: false
    },
    {
        name: "Emergency Backup Kit",
        staff: "Alex Chen",
        location: "Staff Office",
        status: "In Use",
        supplies: "Ice packs used",
        checkedToday: true
    }
];

function renderKits(){
    kitList.innerHTML = "";

    kitCount.textContent = `${medKits.length} Kits`;

    medKits.forEach((kit, index) => {
        const card = document.createElement("div");
        card.classList.add("kit-card");

        let statusClass = "";

        if(kit.status === "Checked"){
            statusClass = "checked";
        }else if(kit.status === "Needs Restock"){
            statusClass = "restock";
        }else if(kit.status === "Missing"){
            statusClass = "missing";
        }else{
            statusClass = "inuse";
        }

        card.innerHTML = `
            <div class="kit-top">
                <h4>${kit.name}</h4>
                <span class="status ${statusClass}">${kit.status}</span>
            </div>

            <div class="kit-info">
                <p><strong>Assigned Staff:</strong> ${kit.staff}</p>
                <p><strong>Location:</strong> ${kit.location}</p>
                <p><strong>Supplies:</strong> ${kit.supplies}</p>
                <p><strong>Checked Today:</strong> ${kit.checkedToday ? "Yes" : "No"}</p>
            </div>

            <button class="delete-btn" onclick="deleteKit(${index})">Remove Kit</button>
        `;

        kitList.appendChild(card);
    });
}

function addKit(){
    const kitName = document.getElementById("kitName").value;
    const assignedStaff = document.getElementById("assignedStaff").value;
    const location = document.getElementById("location").value;
    const status = document.getElementById("status").value;
    const supplies = document.getElementById("supplies").value;
    const checkedToday = document.getElementById("checkedToday").checked;

    if(kitName === "" || assignedStaff === "" || location === ""){
        alert("Please fill in the kit name, assigned staff, and location.");
        return;
    }

    const newKit = {
        name: kitName,
        staff: assignedStaff,
        location: location,
        status: status,
        supplies: supplies || "No notes added",
        checkedToday: checkedToday
    };

    medKits.push(newKit);

    document.getElementById("kitName").value = "";
    document.getElementById("assignedStaff").value = "";
    document.getElementById("location").value = "";
    document.getElementById("status").value = "Checked";
    document.getElementById("supplies").value = "";
    document.getElementById("checkedToday").checked = false;

    renderKits();
}

function deleteKit(index){
    medKits.splice(index, 1);
    renderKits();
}

addKitBtn.addEventListener("click", addKit);

renderKits();