// ============================================================
// BIRTHDAY SYSTEM (UK FORMAT: DD/MM/YYYY)
// ============================================================

async function loadBirthdays() {
  const ops = await loadHybridJSON(GH_OPERATORS_PATH);
  return ops.filter(o => o.birthday && o.birthday.trim() !== "");
}

function parseUKDate(d) {
  const [day, month, year] = d.split("/").map(Number);
  return { day, month, year };
}

function nextBirthdayDate(day, month) {
  const now = new Date();
  const currentYear = now.getFullYear();

  let next = new Date(currentYear, month - 1, day);

  if (next < now) {
    next = new Date(currentYear + 1, month - 1, day);
  }

  return next;
}

function daysBetween(a, b) {
  const diff = b - a;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function formatPrettyDate(day, month) {
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const d = Number(day);
  const suffix =
    d % 10 === 1 && d !== 11 ? "st" :
      d % 10 === 2 && d !== 12 ? "nd" :
        d % 10 === 3 && d !== 13 ? "rd" : "th";

  return `${d}${suffix} of ${monthNames[month - 1]}`;
}

async function showNextBirthday() {
  const list = await loadBirthdays();
  if (!list.length) return;

  const now = new Date();
  const upcoming = [];

  list.forEach(op => {
    const { day, month, year } = parseUKDate(op.birthday);
    const nextDate = nextBirthdayDate(day, month);
    const days = daysBetween(now, nextDate);
    const nextAge = nextDate.getFullYear() - year;

    upcoming.push({
      name: op.name,
      day,
      month,
      date: op.birthday,
      days,
      nextAge
    });
  });

  // Sort by soonest
  upcoming.sort((a, b) => a.days - b.days);

  const msgBox = document.getElementById("birthdayMessage");
  if (!msgBox) return;

  // Take the closest 3 birthdays
  const soon = upcoming.slice(0, 3);

  // TODAY message
  if (soon.length && soon[0].days === 0) {
    const pretty = formatPrettyDate(soon[0].day, soon[0].month);
    msgBox.textContent = `🎂 Today is ${soon[0].name}'s birthday! They turn ${soon[0].nextAge} today (${pretty}).`;
    return;
  }

  // MULTIPLE upcoming birthdays
  msgBox.innerHTML = `🎉 Upcoming birthdays:<br>` +
    soon.map(b => {
      const pretty = formatPrettyDate(b.day, b.month);
      return `${b.name} turns ${b.nextAge} in ${b.days} days (${pretty})`;
    }).join("<br>");
}

document.addEventListener("DOMContentLoaded", showNextBirthday);
