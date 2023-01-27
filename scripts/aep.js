const ID = "the-sky-isles";

// Logo
const logo = document.querySelector("img#logo");
logo.src = `modules/${ID}/styles/ws.svg`;
logo.addEventListener("click", () =>
	window.open(game.world.data.authors.filter(a => a.name === "World Smiths").map(a => a.url)[0])
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
		if (doc.getFlag("world", "aep")) {
			html.classList.add("aep");
		}
	} while ((doc = doc.parent));
}

const getImportOptions = ({ id, title, description }) => ({
	displayJournal: {
		label: "Display Introduction Journal",
		default: true,
		handler: () => game.journal.getName(title)?.sheet.render(true),
	},
	configureWorld: {
		label: "Configure World details",
		default: false,
		handler: () =>
			fetch(getRoute("/setup"), {
				headers: {
					"content-type": "application/json",
				},
				body: JSON.stringify({
					id,
					title,
					description,
					background: `modules/aep/content/${id}/scenes/backgrounds/login.webp`,
					nextSession: null,
					action: "editWorld",
				}),
				method: "POST",
			}),
	},
});

// Add HTML options to the importer form
Hooks.on("renderAdventureImporter", (app, html) => {
	const { adventure } = app;
	if (adventure.getFlag("world", "aep") !== ID) return;

	const importOptions = getImportOptions({
		id: adventure.getFlag("world", "aep"),
		title: adventure.name,
		description: adventure.description,
	});

	// Format options HTML
	let options = `<section class="import-form"><h2>Importer Options</h2>`;
	for (const [name, option] of Object.entries(importOptions)) {
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
	const importOptions = getImportOptions({
		id: adventure.getFlag("world", "aep"),
		title: adventure.name,
		description: adventure.description,
	});

	for (const [name, option] of Object.entries(importOptions)) {
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
				game.packs.get(`${ID}.aep`).render(true);
				Hooks.on("renderCompendium", app => {
					if (app.metadata.packageName === ID) {
						resolve();
					}
				});
			});
		} else if (this.currentStep.id === "importForm") {
			await new Promise(resolve => {
				Hooks.on("renderAdventureImporter", app => {
					if (app.adventure.getFlag("world", "aep")) {
						resolve();
					}
				});
			});
		}
	}
}

Hooks.on("setup", () => {
	const description =
		"This Tour will guide you through importing World Smiths's Amazing Encounters & Places content.";
	let title = "Importing an Amazing Encounters & Places adventure";
	if (ID !== "aep") {
		const t = game.modules.get(ID)?.title;
		if (t) {
			title += `: ${t}`;
		}
	}

	game.settings.register(ID, "importTour", {
		scope: "world",
		config: false,
		type: Boolean,
		default: true,
	});

	game.tours.register(
		ID,
		"import",
		new ImportTour({
			title,
			description,
			display: true,
			restricted: true,
			steps: [
				{
					id: "welcome",
					selector: "",
					title: "Welcome to Amazing Encounters & Places",
					content: description,
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
					selector: `[data-pack='${ID}.aep']`,
					title: "Adventure Pack",
					content: "Open the adventure compendium pack to view it's contents.",
				},
				{
					id: "adventureDoc",
					selector: `.compendium[data-pack='${ID}.aep'] .directory-list`,
					title: "Choose an Adventure",
					content: "Pick an adventure to import into your world.",
					tooltipDirection: TooltipManager.TOOLTIP_DIRECTIONS.UP,
				},
				{
					id: "importForm",
					selector: `.adventure-importer.aep .import-form`,
					title: "Import Options",
					content: "Configure the various options for this import.",
					tooltipDirection: TooltipManager.TOOLTIP_DIRECTIONS.UP,
				},
				{
					id: "import",
					selector: `.adventure-importer.aep button[type='submit']`,
					title: "Import the Adventure!",
					content: "Just click this button to import the adventure. Happy gaming! 🎉",
				},
			],
		})
	);
});

Hooks.on("ready", () => {
	if (game.settings.get(ID, "importTour")) {
		game.tours.get(`${ID}.import`).start();
		game.settings.set(ID, "importTour", false);
	}
});
