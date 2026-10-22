const PHOTOS: [RegExp, string][] = [
  [/math/i, 'maths'],
  [/phys/i, 'physics'],
  [/chem/i, 'chemistry'],
  [/bio/i, 'biology'],
  [/comput|program|\bit\b|software/i, 'computer-science'],
  [/sindhi/i, 'sindhi'],
  [/english|urdu|language/i, 'english'],
  [/islam/i, 'islamiyat'],
];

/** URL of the banner photo for a subject name, or undefined when we have none. */
export const subjectPhoto = (name: string) => {
  const file = PHOTOS.find(([re]) => re.test(name))?.[1];
  return file ? `/subjects/${file}.jpg` : undefined;
};
