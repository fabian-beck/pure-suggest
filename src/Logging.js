import { saveAsFile } from "@/Util.js";

const log = [];

export function logEvent(event, doi, ...args) {
  let currentDate = new Date(Date.now());
  let timestamp =
    currentDate.getHours() +
    ":" +
    currentDate.getMinutes() +
    ":" +
    currentDate.getSeconds();
  log.push(`${event},${timestamp},${doi},${args}`);
}

export function logActionEvent(event, actionDetails = "") {
  let currentDate = new Date(Date.now());
  let timestamp =
    currentDate.getHours() +
    ":" +
    currentDate.getMinutes() +
    ":" +
    currentDate.getSeconds();
  if (actionDetails) {
    actionDetails = String(actionDetails).replaceAll(",", "_");
  }
  log.push(
    `${event},${timestamp},${""},${""},${""},${""},${""},${""},${actionDetails}`
  );
}
export function logPubEvent(
  event,
  doi,
  title="",
  author="",
  selectedPublicationsCount = "",
  PosInSuggestions = "",
  SourceComponent = ""
) {
  let currentDate = new Date(Date.now());
  let timestamp =
    currentDate.getHours() +
    ":" +
    currentDate.getMinutes() +
    ":" +
    currentDate.getSeconds();
  log.push(
    `${event},${timestamp},${doi},${title.replaceAll(",","_")},${author},${selectedPublicationsCount},${PosInSuggestions},${SourceComponent}`
  );
}

export function getEventLog() {
  let finalLog =
    "event,date,doi,title,author,selectedPublicationsCount,posInSuggestions,activationSourceComponent,actionDetails\n" +
    log.join("\n");
  saveAsFile("session_log.csv", "application/logFiles", finalLog);
  console.log(finalLog);
}
