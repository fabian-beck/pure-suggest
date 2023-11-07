const log = [];

export function logEvent(event, doi, ...args) {
  let currentDate = new Date(Date.now())
  let timestamp = currentDate.getHours()+":"+currentDate.getMinutes()+":"+currentDate.getSeconds()
  log.push(
    `${event},${timestamp},${doi},${args}`
  );
}

export function logActionEvent(event,actionDetails=""){
  let currentDate = new Date(Date.now())
  let timestamp = currentDate.getHours()+":"+currentDate.getMinutes()+":"+currentDate.getSeconds()
  log.push(
    `${event},${timestamp},${""},${""},${""},${""},${actionDetails}`
  );
}
export function logPubEvent(event, doi, selectedPublicationsCount="", PosInSuggestions="",SourceComponent=""){
  let currentDate = new Date(Date.now())
  let timestamp = currentDate.getHours()+":"+currentDate.getMinutes()+":"+currentDate.getSeconds()
  log.push(
    `${event},${timestamp},${doi},${selectedPublicationsCount},${PosInSuggestions},${SourceComponent}`
  );
}


export function getEventLog() {
  console.log("event,date,doi,selectedPublicationsCount,posInSuggestions,activationSourceComponent,actionDetails\n" + log.join("\n"));
}