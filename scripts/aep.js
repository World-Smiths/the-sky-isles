const ID = "aep";

const id = "the-sky-isles";
const title = "The Sky Isles";
const getPackage = () => game.modules.get(id)?.active ? id : "world";

// Logo
const logo = document.querySelector("img#logo");
logo.src = `modules/${id}/styles/ws.svg`;
logo.addEventListener("click", () =>
    window.open(game.world.data.authors
        .filter(a => a.name === "World Smiths")
        .map(a => a.url)[0])
);

const style = document.createElement("style");
style.id = "world-smiths";
style.innerHTML = `
img#logo {
    left: 30px;
    cursor: pointer;
}
img#logo:hover {
    filter: brightness(0.8);
}`;
document.head.appendChild(style);

// Custom flag
Hooks.on("renderJournalSheet", classIfFlag);
Hooks.on("renderActorSheet", classIfFlag);
Hooks.on("renderItemSheet", classIfFlag);
Hooks.on("renderAdventureImporter", classIfFlag);

function classIfFlag(app, [html]) {
    let doc = app.document;
    do {
        if (doc.getFlag("world", ID)) {
            html.classList.add(ID);
        }
    } while (doc = doc.parent);
}

const ADVENTURE = {
    importOptions: {
        displayJournal: {
            label: "Display Introduction Journal",
            default: true,
            handler: () => game.journal.getName(title).sheet.render(true),
        },
        configureWorld: {
            label: "Configure World details",
            default: false,
            handler: () => fetch(getRoute("/setup"), {
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify({
                    title,
                    background: `modules/${id}/scenes/backgrounds/login.webp`,
                    nextSession: null,
                    description: "Explore this stunning yet perilous grove, home to ravenous harpies, vicious lizardfolk, and unholy undead. Explore and discover this region&rsquo;s secret and restore the balance of nature.",
                    id: game.world.id,
                    action: "editWorld"
                }),
                method: "POST",
            }),
        }
    }
};

// Add HTML options to the importer form
Hooks.on("renderAdventureImporter", (app, html) => {
    if (!app.adventure.getFlag("world", ID)) return;

    // Format options HTML
    let options = `<section class="import-form"><h2>Importer Options</h2>`;
    for (const [name, option] of Object.entries(ADVENTURE.importOptions)) {
        options += `<div class="form-group">
          <label class="checkbox">
              <input type="checkbox" name="${name}" title="${option.label}" ${option.default ? "checked" : ""}/>
              ${option.label}
          </label>
      </div>`;
    }
    options += `</section>`;

    // Insert options
    html.find(".adventure-contents").append(options);
    app.setPosition();
});

// Handle options supported by the importer
Hooks.on("importAdventure", async (adventure, formData) => {
    for (let [name, option] of Object.entries(ADVENTURE.importOptions)) {
        if (formData[name]) await option.handler(adventure, option);
    }
});

// Import Tour
class ImportTour extends Tour {
    async _preStep() {
        await super._preStep();

        if (this.currentStep.sidebarTab) {
            ui.sidebar.activateTab(this.currentStep.sidebarTab);
        }

        if (this.currentStep.id === "adventurePack") {
            await new Promise(resolve => {
                game.packs.get(`${getPackage()}.${ID}`).render(true);
                Hooks.on("renderCompendium", app => {
                    if (app.metadata.name === ID) {
                        resolve();
                    }
                });
            });
        } else if (this.currentStep.id === "importForm") {
            await new Promise(resolve => {
                Hooks.on("renderAdventureImporter", app => {
                    if (app.adventure.getFlag("world", ID)) {
                        resolve()
                    }
                });
            });
        }
    }
}

const tourDescription = "This Tour will guide you through importing World Smiths's Amazing Encounters & Places content.";

Hooks.on("setup", () => {
    game.settings.register(ID, "importTour", {
        scope: "world",
        config: false,
        type: Boolean,
        default: true,
    });

    game.tours.register(ID, "import", new ImportTour({
        title: "Importing an Amazing Encounters & Places adventure",
        description: tourDescription,
        restricted: true,
        steps: [
            {
                id: "welcome",
                selector: "",
                title: `Welcome to ${title}`,
                content: tourDescription,
            },
            {
                id: "compendiumPacks",
                selector: ".tabs>a[data-tab='compendium']",
                title: "Compendium Packs",
                content: "Open the Compendium sidebar tab to view your Adventure compendiums.",
                sidebarTab: "compendium",
            },
            {
                id: "adventurePack",
                selector: `[data-pack='${getPackage()}.${ID}']`,
                title: "Adventure Pack",
                content: "Open the adventure compendium pack to view it's contents.",
            },
            {
                id: "adventureDoc",
                selector: `.compendium[data-pack='${getPackage()}.${ID}'] .directory-list`,
                title: "Choose an Adventure",
                content: "Pick an adventure to import into your world.",
                tooltipDirection: TooltipManager.TOOLTIP_DIRECTIONS.UP,
            },
            {
                id: "importForm",
                selector: `.adventure-importer.${ID} .import-form`,
                title: "Import Options",
                content: "Configure the various options for this import.",
                tooltipDirection: TooltipManager.TOOLTIP_DIRECTIONS.UP,
            },
            {
                id: "import",
                selector: `.adventure-importer.${ID} button[type='submit']`,
                title: "Import the Adventure!",
                content: "Just click this button to import the adventure. Happy gaming! 🎉",
            },
        ],
    }));
});

Hooks.on("ready", () => {
    if (game.settings.get(ID, "importTour")) {
        game.tours.get(`${ID}.import`).start();
        game.settings.set(ID, "importTour", false);
    }
});
