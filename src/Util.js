// https://stackoverflow.com/questions/3665115/how-to-create-a-file-in-memory-for-user-to-download-but-not-through-server?answertab=active#tab-top
export function saveAsFile(filename, data) {
  const blob = new Blob([data], { type: "text/csv" });
  if (window.navigator.msSaveOrOpenBlob) {
    window.navigator.msSaveBlob(blob, filename);
  } else {
    const elem = window.document.createElement("a");
    elem.href = window.URL.createObjectURL(blob);
    elem.download = filename;
    document.body.appendChild(elem);
    elem.click();
    document.body.removeChild(elem);
  }
}

// https://stackoverflow.com/questions/49820013/javascript-scrollintoview-smooth-scroll-and-offset
export function scrollToTargetAdjusted(element, offsetY) {
  console.log(element);
  var elementPosition = element.getBoundingClientRect().top;
  var offsetPosition = elementPosition + window.pageYOffset - offsetY;

  window.scrollTo({
    top: offsetPosition,
    behavior: "smooth",
  });
}