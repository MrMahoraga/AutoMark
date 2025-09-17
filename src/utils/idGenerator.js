function generateSchoolId(name) {
  return name.trim().substring(0, 3).toUpperCase();
}

function generateTeacherId(schoolId, uniqueNumber) {
  return `${schoolId}-${uniqueNumber.toString().padStart(3, '0')}`;
}

module.exports = { generateSchoolId, generateTeacherId };