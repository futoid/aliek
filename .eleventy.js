export default function (eleventyConfig) {
  // Copy root static files to _site/
  eleventyConfig.addPassthroughCopy("index.html");
  eleventyConfig.addPassthroughCopy("styles.css");
  eleventyConfig.addPassthroughCopy("favicon.ico");

  // Watch both locations
  eleventyConfig.addWatchTarget("./");
  eleventyConfig.addWatchTarget("./src/");

  // Add blogs collection
  eleventyConfig.addCollection("blogs", function (collectionApi) {
    return collectionApi
      .getFilteredByGlob("src/get/*.md")
      .sort((a, b) => new Date(b.data.date) - new Date(a.data.date));
  });

  return {
    dir: {
      input: "src", // Templates ONLY from src/
      output: "_site",
    },
  };
}
