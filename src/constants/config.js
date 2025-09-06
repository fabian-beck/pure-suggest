// Application-wide configuration constants

// API Configuration
export const API_ENDPOINTS = {
  PUBLICATIONS: "https://pure-publications-cw3de4q5va-ew.a.run.app/",
  CROSSREF: "https://api.crossref.org/works",
  GOOGLE_SCHOLAR: "https://scholar.google.de/scholar"
};

export const API_PARAMS = {
  NO_CACHE_PARAM: "&noCache=true",
  CROSSREF_EMAIL: "fabian.beck@uni-bamberg.de",
  CROSSREF_FILTER: "has-references:true"
};

// Pagination Configuration
export const PAGINATION = {
  LOAD_MORE_INCREMENT: 100,
  INITIAL_SUGGESTIONS_COUNT: 100
};

// Scoring Configuration
export const SCORING = {
  DEFAULT_BOOST_FACTOR: 1,
  BOOST_MULTIPLIER: 2,
  FIRST_AUTHOR_BOOST: 2,
  NEW_PUBLICATION_BOOST: 2
};

// Time Configuration
export const CURRENT_YEAR = new Date().getFullYear();