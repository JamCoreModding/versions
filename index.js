const VERSION_PATTERN = /{{(.*?)}}/g;

const TEMPLATE_NEOFORGE = `[versions]
# https://modrinth.com/mod/architectury-api/versions
architectury = "{{modrinth:architectury-api}}"

# https://parchmentmc.org/docs/getting-started
parchment-minecraft = "{{minecraft}}"
parchment = "{{parchment}}"

# https://projects.neoforged.net/neoforged/neoforge
neoforge = "{{neoforge}}"

# https://fabricmc.net/develop
fabric-loader = "{{fabric-loader}}"
fabric-api = "{{modrinth:fabric-api}}"

# https://modrinth.com/mod/jamlib/versions
jamlib = "{{modrinth:jamlib}}"

# https://modrinth.com/mod/modmenu/versions
modmenu = "{{modrinth:modmenu}}"

[libraries]
architectury-common = { module = "dev.architectury:architectury", version.ref = "architectury" }
architectury-fabric = { module = "dev.architectury:architectury-fabric", version.ref = "architectury" }
architectury-neoforge = { module = "dev.architectury:architectury-neoforge", version.ref = "architectury" }

neoforge = { module = "net.neoforged:neoforge", version.ref = "neoforge" }

fabric-loader = { module = "net.fabricmc:fabric-loader", version.ref = "fabric-loader" }
fabric-api = { module = "net.fabricmc.fabric-api:fabric-api", version.ref = "fabric-api" }

jamlib-common = { module = "io.github.jamalam360:jamlib", version.ref = "jamlib" }
jamlib-fabric = { module = "io.github.jamalam360:jamlib-fabric", version.ref = "jamlib" }
jamlib-neoforge = { module = "io.github.jamalam360:jamlib-neoforge", version.ref = "jamlib" }

modmenu = { module = "maven.modrinth:modmenu", version.ref = "modmenu" }`;

const TEMPLATE_FORGE = `[versions]
# https://modrinth.com/mod/architectury-api/versions
architectury = "{{modrinth:architectury-api}}"

# https://parchmentmc.org/docs/getting-started
parchment-minecraft = "{{minecraft}}"
parchment = "{{parchment}}"

# https://files.minecraftforge.net/
forge = "{{forge}}"

# https://fabricmc.net/develop
fabric-loader = "{{fabric-loader}}"
fabric-api = "{{modrinth:fabric-api}}"

# https://modrinth.com/mod/jamlib/versions
jamlib = "{{modrinth:jamlib}}"

# https://modrinth.com/mod/modmenu/versions
modmenu = "{{modrinth:modmenu}}"

[libraries]
architectury-common = { module = "dev.architectury:architectury", version.ref = "architectury" }
architectury-fabric = { module = "dev.architectury:architectury-fabric", version.ref = "architectury" }
architectury-forge = { module = "dev.architectury:architectury-forge", version.ref = "architectury" }

forge = { module = "net.minecraftforge:forge", version.ref = "forge" }

fabric-loader = { module = "net.fabricmc:fabric-loader", version.ref = "fabric-loader" }
fabric-api = { module = "net.fabricmc.fabric-api:fabric-api", version.ref = "fabric-api" }

jamlib-common = { module = "io.github.jamalam360:jamlib", version.ref = "jamlib" }
jamlib-fabric = { module = "io.github.jamalam360:jamlib-fabric", version.ref = "jamlib" }
jamlib-forge = { module = "io.github.jamalam360:jamlib-forge", version.ref = "jamlib" }

modmenu = { module = "maven.modrinth:modmenu", version.ref = "modmenu" }`;

function sortSemver(versions, ascending = true) {
  // Create a copy of the array to avoid modifying the original
  const result = [...versions];

  result.sort((a, b) => {
    const aParts = a.split("-")[0].split("+")[0].split(".").map((part) => parseInt(part, 10));
    const bParts = b.split("-")[0].split("+")[0].split(".").map((part) => parseInt(part, 10));

    while (aParts.length < 3) aParts.push(0);
    while (bParts.length < 3) bParts.push(0);

    if (aParts[0] !== bParts[0]) {
      return ascending ? aParts[0] - bParts[0] : bParts[0] - aParts[0];
    }

    if (aParts[1] !== bParts[1]) {
      return ascending ? aParts[1] - bParts[1] : bParts[1] - aParts[1];
    }

    return ascending ? aParts[2] - bParts[2] : bParts[2] - aParts[2];
  });

  return result;
}

function onError(error) {
  console.error(`Error: ${error}`);
}

function onVersionSelect(pre, version) {
  let template;

  if (version.substring(0, 4) === "1.20") {
    template = TEMPLATE_FORGE;
  } else {
    template = TEMPLATE_NEOFORGE;
  }

  pre.innerText = template;
  const matches = template.matchAll(VERSION_PATTERN);

  for (const match of matches) {
    const [full, key] = match;
    const [type, extra] = key.split(":");

    if (type === "modrinth") {
      fetch(`https://api.modrinth.com/v2/project/${extra}/version?game_versions=[%22${version}%22]`)
        .then((response) => {
          response
            .json()
            .then((data) => {
              let version = data[0].version_number;

              if (extra === "architectury-api") {
                version = version.substring(0, version.indexOf("+"));
              }

              pre.innerText = pre.innerText.replace(full, version);
            })
            .catch(onError);
        })
        .catch(onError);
    } else if (type === "minecraft") {
      pre.innerText = pre.innerText.replace(full, version);
    } else if (type === "parchment") {
      const params = new URLSearchParams();
      params.append(
        "url",
        `https://ldtteam.jfrog.io/ui/api/v1/download?repoKey=parchmentmc-internal&path=org%2Fparchmentmc%2Fdata%2Fparchment-${version}%2Fmaven-metadata.xml`
      );
      fetch(`https://corsproxy.io/?${params.toString()}`)
        .then((response) => {
          response
            .text()
            .then((data) => {
              const parser = new DOMParser();
              const xml = parser.parseFromString(data, "text/xml");
              const version = xml.querySelector("latest").textContent;
              pre.innerText = pre.innerText.replace(full, version);
            })
            .catch(onError);
        })
        .catch(onError);
    } else if (type === "neoforge") {
      fetch("https://maven.neoforged.net/releases/net/neoforged/neoforge/maven-metadata.xml")
        .then((response) => {
          response
            .text()
            .then((data) => {
              const parser = new DOMParser();
              const xml = parser.parseFromString(data, "text/xml");
              const versions = Array.from(xml.querySelectorAll("version"));
              pre.innerText = pre.innerText.replace(
                full,
                sortSemver(versions
                  .map((v) => v.textContent)
                  .filter((v) => v.startsWith(version.substring(2))), false)[0]
              );
            })
            .catch(onError);
        })
        .catch(onError);
    } else if (type === "fabric-loader") {
      fetch(`https://meta.fabricmc.net/v2/versions/loader/${version}`)
        .then((response) => {
          response
            .json()
            .then((data) => {
              pre.innerText = pre.innerText.replace(full, data[0].loader.version);
            })
            .catch(onError);
        })
        .catch(onError);
    } else if (type === "forge") {
      fetch("https://maven.minecraftforge.net/releases/net/minecraftforge/forge/maven-metadata.xml")
        .then((response) => {
          response
            .text()
            .then((data) => {
              const parser = new DOMParser();
              const xml = parser.parseFromString(data, "text/xml");
              const versions = Array.from(xml.querySelectorAll("version"));
              pre.innerText = pre.innerText.replace(
                full,
                sortSemver(versions
                  .map((v) => v.textContent)
                  .filter((v) => v.startsWith(version)), false)[0]
              );
            })
            .catch(onError);
        })
        .catch(onError);
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const versionPicker = document.getElementById("version-picker");
  const versionPre = document.getElementById("versions");

  // Fill in Minecraft versions
  fetch("https://meta.fabricmc.net/v2/versions/game")
    .then((response) => {
      response.json().then((data) => {
        data.forEach((version) => {
          if (version.stable) {
            const option = document.createElement("option");
            option.value = version.version;
            option.innerText = version.version;
            versionPicker.appendChild(option);
          }
        });

        onVersionSelect(versionPre, versionPicker.value);
      });
    })
    .catch(onError);

  versionPicker.addEventListener("change", () => {
    const version = versionPicker.value;
    onVersionSelect(versionPre, version);
  });
});
