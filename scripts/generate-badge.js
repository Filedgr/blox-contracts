const fs = require("fs");
const { makeBadge } = require("badge-maker");
function parseCoverage() {
  const lcovPath = "./coverage/lcov.info";
  if (!fs.existsSync(lcovPath)) {
    console.error("lcov.info not found");
    process.exit(1);
  }

  const lcovData = fs.readFileSync(lcovPath, "utf8");
  const lines = lcovData.split("\n");

  let totalHits = 0;
  let totalLines = 0;

  for (const line of lines) {
    if (line.startsWith("DA:")) {
      const parts = line.split(",");
      totalLines += 1;
      if (parseInt(parts[1], 10) > 0) {
        totalHits += 1;
      }
    }
  }

  const coverage = ((totalHits / totalLines) * 100).toFixed(2);
  return coverage;
}

function generateBadge(coverage) {
  const format = {
    label: "coverage",
    message: `${coverage}%`,
    color: "green",
  };

  if (coverage < 80) {
    format.color = "red";
  } else if (coverage < 90) {
    format.color = "yellow";
  }

  const svg = makeBadge(format);
  fs.writeFileSync("coverage-badge.svg", svg);
}

const coverage = parseCoverage();
generateBadge(coverage);
console.log(`Generated coverage badge with ${coverage}% coverage`);
