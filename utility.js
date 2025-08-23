function convertToQueryParams(paramsObject) {
  const searchParams = new URLSearchParams();
  for (const key in paramsObject) {
    if (Object.prototype.hasOwnProperty.call(paramsObject, key)) {
      searchParams.append(key, paramsObject[key]);
    }
  }
  return searchParams.toString();
}

function transformToArray(catList) {
  return catList.flatMap((cat) =>
    cat.subCategories.map((subCat) => [cat.id, subCat.id, subCat.name])
  );
}

// Levenshtein Distance
function levenshtein(a, b) {
  const matrix = Array.from({ length: a.length + 1 }, (_, i) =>
    Array(b.length + 1).fill(0)
  );
  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[a.length][b.length];
}

// Hybrid fuzzy + substring search
function fuzzySearch(query, list, threshold = 0.4) {
  query = query.toLowerCase();

  return list
    .map((itemArray) => {
      const item = itemArray[2];
      const lower = item.toLowerCase();

      // exact substring boost
      if (lower.includes(query)) {
        const startIdx = lower.indexOf(query);
        // closer to start = higher score
        const score = 1 - startIdx / lower.length + 0.5;
        return { itemArray, score };
      }

      // otherwise fallback to levenshtein
      const distance = levenshtein(query, lower);
      const score = 1 - distance / Math.max(query.length, lower.length);
      return { itemArray, score };
    })
    .filter((result) => result.score >= threshold)
    .sort((a, b) => b.score - a.score);
}

// Debounce
function debounce(fn, delay) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

const API_BASE_URL = "https://api-winkit-node.onrender.com";
