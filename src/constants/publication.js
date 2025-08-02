export const SURVEY_THRESHOLDS = {
  REFERENCE_COUNT_HIGH: 100,
  REFERENCE_COUNT_MIN: 50
};

export const CITATION_THRESHOLDS = {
  HIGHLY_CITED_PER_YEAR: 10,
  UNNOTED_PER_YEAR: 1
};

export const PUBLICATION_AGE = {
  NEW_YEARS: 2
};

export const SCORING = {
  DEFAULT_BOOST_FACTOR: 1,
  BOOST_MULTIPLIER: 2,
  FIRST_AUTHOR_BOOST: 2,
  NEW_PUBLICATION_BOOST: 2
};

export const TEXT_PROCESSING = {
  MAX_TITLE_LENGTH: 300,
  TITLE_TRUNCATION_POINT: 295,
  TITLE_TRUNCATION_SUFFIX: "[...]"
};

export const SURVEY_KEYWORDS = /(survey|state|review|advances|future)/i;

export const ORDINAL_REGEX = /\d+(st|nd|rd|th)/i;

export const ROMAN_NUMERAL_REGEX = /^M{0,4}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})(\.?)$/i;