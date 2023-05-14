const settings = [
    {
      id: "terminal",
      name: "Terminal",
      icon: "fa-solid fa-code",
      menu: false
    }, {
      id: "pushs",
      name: "Pushs",
      icon: "fa-regular fa-bell",
      menu: true,
      items: [{
        type: "info",
        id: "status",
        name: "Status",
        icon: "fa-solid fa-circle-info",
        description: "Wird geladen",
        action: "Aktivieren"
      }, {
        type: "action",
        id: "reload",
        name: "Neu laden",
        icon: "fa-solid fa-rotate-right",
        description: "Registriere den Service Worker erneut, um Probleme mit Benachrichtungen zu lösen",
        action: "Neu laden"
      }, {
        type: "action",
        id: "delete",
        name: "Dienst abmelden",
        icon: "fa-solid fa-trash-can",
        description: "Du kannst dich jederzeit wieder von Benachrichtigungen abmelden",
        action: "Abmelden"
      }, {
        type: "note",
        note: "Auf iOS musst du die Seite als App auf den Startbildschirm hinzufügen"
      }]
    },
    {
      id: "reload",
      name: "Neu laden",
      icon: "fa-solid fa-rotate-right",
      menu: false
    },
    {
      id: "status",
      name: "Status",
      icon: "fa-solid fa-wrench",
      menu: true,
      items: [{
        type: "info",
        id: "loading",
        name: "Wird geladen",
        icon: "fa-solid fa-spinner",
        description: "Bitte warte einen kurzen Moment"
      }]
    },
    {
      id: "logoff",
      name: "Abmelden",
      icon: "fa-solid fa-right-from-bracket",
      menu: false
    },
    {
      id: "credentials",
      name: "Credentials",
      icon: "fa-solid fa-key",
      menu: true,
      items: [{
        type: "info",
        id: "username",
        name: "Nutzername",
        icon: "fa-solid fa-user",
        description: "Wird geladen",
      }, {
        type: "info",
        id: "password",
        name: "Passwort",
        icon: "fa-solid fa-key",
        description: "Wird geladen",
      }, {
        type: "info",
        id: "school",
        name: "Deine Schule",
        icon: "fa-solid fa-school",
        description: "Wird geladen",
      }, {
        type: "info",
        id: "tokens",
        name: "Tokens",
        icon: "fa-solid fa-fingerprint",
        description: "Wird geladen",
      }, {
        type: "note",
        note: "Deine Daten werden nur im Browser gespeichert"
      }]
    }
  ]
  
  const loginRequiredSettings = ["pushs", "logoff", "credentials"];
  function buildSettingsHomePage() {
    currentSettingsPanel = null;
    const menu = $(".menu[type=settings] .main-wrapper");
    settings.forEach((setting) => {
      menu.append(`
              <div class="setting-wrapper${loginRequiredSettings.includes(setting.id) && !keys.token ? " d-none" : ""}" setting="${setting.id}">
                  <div class="setting">
                      <i class="${setting.icon}"></i>
                      <i class="${setting.menu ? "fa-solid fa-angle-right" : ""}"></i>
                  </div>
                  <p>${setting.name}</p>
              </div>
          `);
    });
  
    loadSettingEventListeners();
  }
  
  function loadSettingEventListeners() {
    $(".setting-wrapper").on("mousedown", (event) => {
      const setting = $(event.target).closest(".setting-wrapper").attr("setting");
  
      if (menus["animationRunning"].includes("settings"))
        return;
  
      const settingElement = $(event.target).closest(".setting")
        .css("background-color", "rgba(0, 0, 0, 0.2)");
      setTimeout(() => { settingElement.css("background-color", ""); }, 200);
  
      switch (setting) {
        case "terminal": {
          $(".console").removeClass("d-none");
          break;
        }
        case "logoff": {
          $(".dialog-wrapper").show();
          break;
        }
        case "pushs": {
          openSettingsPanel("pushs");
          break;
        }
        case "reload": {
          location.reload();
          break;
        }
        case "credentials": {
          openSettingsPanel("credentials");
          break;
        }
        case "status": {
          openSettingsPanel("status");
          break;
        }
        default:
          console.log("No setting found with name " + setting);
      }
    });
  }
  
  let currentSettingsPanel = null;
  
  // Listens for operations to go back a page
  $(".menu[type=settings] .top-button[action=back]").on("mousedown", () => {
    menus["animationRunning"].push("settings");
    const height = getSettingsMenuHeight();
    const menu = $(".menu[type=settings]").css("height", height + 8);
    $(".setting-item").each((index, element) => {
      element.animate([
        { transform: "translateX(0vw)", opacity: 1 },
        { transform: "translateX(-50vw)", opacity: 0 },
      ], createAnimationProperties(400));
    });
  
    if (currentSettingsPanel === "status")
      $(".status-wrapper").each((index, element) => {
        element.animate([
          { transform: "translateX(0vw)", opacity: 1 },
          { transform: "translateX(-50vw)", opacity: 0 },
        ], createAnimationProperties(400));
      });
  
    currentSettingsPanel = null;
  
    $(".menu[type=settings] .top-button[action=back]").addClass("d-none");
  
    setTimeout(() => {
      clearSettingsMenu();
      buildSettingsHomePage();
      $(".setting-wrapper").each((index, element) => {
        element.animate([
          { transform: "translateX(100vw)", opactiy: 0 },
          { transform: "translateX(0vw)", opacity: 1 }
        ], createAnimationProperties(400));
      });
  
      const animation = menu[0].animate([
        { transform: "translateY(0px)" },
        { transform: `translateY(${height - getSettingsMenuHeight()}px)` }
      ], createAnimationProperties(400));
  
      setTimeout(() => {
        animation.cancel();
        menus["animationRunning"].splice(menus["animationRunning"].indexOf("settings"), 1);
        menu.css("transform", "translateY(0px)")
          .css("max-height", "")
          .css("height", "");
      }, 390);
    }, 400 * animationHideTimeout);
  });
  
  async function loadSettingItemsOverrides(setting) {
    switch (setting) {
      case "pushs": {
        // Here we need to show the user that their system isn't supported
        if (!("serviceWorker" in navigator)) {
          setSettingActionsDisabled(["reload", "delete"]);
          $(".menu[type=settings] .setting-item[item=status] .description")
            .html("Service Worker werden von deinem Browser nicht unterstützt");
          break;
        }
  
        if (Notification.permission === "denied") {
          setSettingActionsDisabled(["reload", "delete"]);
          $(".menu[type=settings] .setting-item[item=status] .description")
            .html("Du hast die Anfrage abgelehnt");
          break;
        }
  
        const registration = await navigator.serviceWorker.getRegistration();
        if (!registration) {
          $(".menu[type=settings] .setting-item[item=status] .action").removeClass("d-none");
          setSettingActionsDisabled(["reload", "delete"]);
        }
        $(".menu[type=settings] .setting-item[item=status] .description")
          .html(`Der Dienst ist ${!registration ? "nicht " : ""} registriert`);
        break;
      }
      case "credentials": {
        const credentials = JSON.parse(localStorage.getItem("credentials"));
        $(".setting-item[item=username] .description").html(credentials.username);
        $(".setting-item[item=password] .description").html(credentials.password.replace(/./g, "•"));
        $(".setting-item[item=school] .description").html(credentials.id);
        $(".setting-item[item=tokens] .description").html(`<ul style="margin-left: 0.75rem;"><li type="disc">${keys.token}</li><li type="disc">${keys.moodle.cookie}</li></ul>`);
      }
    }
  }
  
  /**
   * Disables a list of actions in the settings
   * @param {string[]} buttons The array of IDs
   */
  function setSettingActionsDisabled(buttons) {
    for (const item of buttons)
      $(`.menu[type=settings] .setting-item[item=${item}] .action`).addClass("disabled");
  }
  
  function addSettingItemsEventListeners() {
    $(".setting-item .action").on("mousedown", async (event) => {
      if (event.target.classList.contains("disabled"))
        return;
      const item = $(event.target).addClass("pressed").closest(".setting-item").attr("item");
      const setting = settings.find(x => x.id === currentSettingsPanel);
      if (!setting)
        return console.log("Somehow no setting is selected while the menu is open");
      setTimeout(() => {
        $(event.target).removeClass("pressed");
      }, 200);
      switch (currentSettingsPanel) {
        case "pushs": {
          switch (item) {
            case "reload": {
              removeServiceWorker(false);
              setSetting("noServiceWorker", false);
              break;
            }
            case "delete": {
              removeServiceWorker(true);
              break;
            }
            case "status": {
              closeMenu("settings");
              await Notification.requestPermission();
              setSetting("saveUserName", confirm("Darf NUR dein Nutzername für Identifikationszwecke in der Datenbank gespeichert werden?"));
              setSetting("noServiceWorker", false);
              loadServiceWorker(true);
            }
          }
        }
      }
    });
  }
  
  /**
   * Opens a setting panel from a given setting
   * @param {string} setting The ID of the setting to show
   */
  function openSettingsPanel(setting) {
    if (menus["animationRunning"].includes("settings"))
      return;
    menus["animationRunning"].push("settings");
    const content = $(".menu[type=settings] .main-wrapper");
    // First we move all the main setting buttons out
    // of our way and remove them later on
    $(".setting-wrapper").each((index, element) => {
      element.animate([
        { transform: "translateX(0vw)", opacity: 1 },
        { transform: "translateX(-50vw)", opacity: 0 },
      ], createAnimationProperties(400, "ease-in-out"));
    });
    currentSettingsPanel = setting;
    setTimeout(async () => {
      // This is needed to later calculate the difference
      const height = getSettingsMenuHeight();
      // We have to set the max-height, otherwise when replacing the objects
      // the menu height will instantly go up (or down) to the new height
      const menu = $(".menu[type=settings]").css("height", height + 8).css("min-height", height + 8);
      // Now it can be emptied as the content has been
      // moved out of the way (the setting-wrappers)
      clearSettingsMenu();
      // This section is responsible for filling
      // in the new action dialogs
      const data = settings.find(x => x.id === setting);
      if (!data || !data.items)
        return console.error("No data found for setting " + setting);
      data.items.forEach((item) => {
        if (item.type === "note")
          return content.append(`<small class="setting-item note">${item.note}</small>`);
        content.append(`
                  <div class="setting-item" type="${item.type}" item="${item.id}">
                      <div class="left">
                          <div class="name">
                              <i class="${item.icon}"></i>
                              ${item.name}
                          </div>
                          <div class="description">
                              ${item.description}
                          </div>
                      </div>
                      <div class="right">
                          <div class="action${item.type === "info" ? " d-none" : ""}">
                              ${item.action}
                          </div>
                      </div>
                  </div>
              `);
      });
      if (data.id === "status") {
  
        // We encase it so it doesn't stop other
        // operations from running normally
        (async () => {
          const json = await makeRequest("status");
          if (json.error)
            return;
          
          await delay(1000);
  
          if (currentSettingsPanel !== "status")
            return;
  
          const previousHeight = $(".menu[type=settings]").height();
  
          $(".menu[type=settings] .main-wrapper").html("<div class='status-wrapper'></div>");
  
          if (!json.status.length)
            $(".menu[type=settings] .main-wrapper .status-wrapper").html("<p>Status konnte nicht geladen werden</p>");
  
          for (const item of json.status) {
            $(".menu[type=settings] .main-wrapper .status-wrapper").append(`
                          <div class="status-info">
                              <img src="${item.online ? "https://i.imgur.com/W4MJbgE.png" : "https://i.imgur.com/vOzclrW.png"}">
                              <div>
                                  <p>${item.name}</p>
                                  <small>${item.online ? "Online" : "Offline"}${item.update ? " | Update geplant" : ""}</small>
                              </div>
                          </div>`);
          }
  
          $(".menu[type=settings]")[0].animate([
            { transform: `translateY(${$(".menu[type=settings]").height() - previousHeight}px)` },
            { transform: "translateY(0px)" }
          ], createAnimationProperties(500));
        })();
  
      }
      loadSettingItemsOverrides(currentSettingsPanel);
      // This animation moves the menu up/down,
      // depending on whats needed (it later gets
      // cancelled or it may look off and be buggy
      const animation = menu[0].animate([
        { transform: "translateY(0px)" },
        { transform: `translateY(${height - getSettingsMenuHeight()}px)` }
      ], createAnimationProperties(400, "ease-in-out"));
      // This animation moves the whole main part
      // from the right to the center of the menu
      $(".setting-item").each((index, element) => {
        element.animate([
          { transform: "translateX(100vw)", opactiy: 0 },
          { transform: "translateX(0vw)", opacity: 1 }
        ], createAnimationProperties(400, "ease-in-out"));
      });
  
      setTimeout(() => {
        animation.cancel();
        menus["animationRunning"].splice(menus["animationRunning"].indexOf("settings"), 1);
        menu.css("transform", "translateY(0px)")
          .css("height", "")
          .css("min-height", "");
        $(".menu[type=settings] .top-button[action=back]").removeClass("d-none");
        addSettingItemsEventListeners();
      }, 390);
    }, 400 * animationHideTimeout);
  }
  
  function getSettingsMenuHeight() {
    return $(".menu[type=settings] .main-wrapper").height() +
      $(".menu[type=settings] .top-wrapper").height() +
      $(".menu[type=settings] .white-space").height();
  }
  
  function clearSettingsMenu() {
    $(".menu[type=settings] .main-wrapper").html("");
  }
  