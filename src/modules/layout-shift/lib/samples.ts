export type SampleLanguage = 'en' | 'ru';

export interface Sample {
  title: string;
  intro: string;
  heading: string;
  paragraphs: string[];
  items: string[];
  subheading: string;
  quote: string;
  buttons: string[];
}

export const samples: Record<SampleLanguage, Sample> = {
  en: {
    title: 'Fonts that stay put',
    intro:
      'A page first paints with a fallback font and then swaps to the web font. When the two fonts differ in width or height, every line below the swap moves.',
    heading: 'Why layout shifts happen',
    paragraphs: [
      'Text set in a fallback font rarely has the same width as the same text in the web font, so words wrap differently and paragraphs gain or lose lines. The content underneath is pushed down or pulled up by the difference.',
      'Adjusting the size and the vertical metrics of the fallback font makes both fonts occupy nearly the same space, which keeps the swap from moving anything on the page.',
      'Short strings such as buttons, menu items and captions mostly change in width, while long paragraphs mostly change in height because of different line breaks.',
    ],
    items: [
      'Match the width of every glyph',
      'Match ascent and descent',
      'Keep the line gap equal',
      'Measure the result',
    ],
    subheading: 'A quotation to wrap',
    quote:
      'The quick brown fox jumps over the lazy dog while the sphinx of black quartz judges my vow.',
    buttons: ['Download', 'Learn more', 'Sign in'],
  },
  ru: {
    title: 'Шрифты, которые не двигают страницу',
    intro:
      'Страница сначала рисуется запасным шрифтом, а потом меняет его на веб-шрифт. Если шрифты различаются шириной или высотой, всё ниже места замены сдвигается.',
    heading: 'Почему возникают сдвиги вёрстки',
    paragraphs: [
      'Текст запасным шрифтом редко занимает столько же места, сколько тот же текст веб-шрифтом, поэтому слова переносятся иначе, а абзацы получают или теряют строки. Содержимое ниже сдвигается на эту разницу.',
      'Подгонка размера и вертикальных метрик запасного шрифта делает так, что оба шрифта занимают почти одинаковое место, и замена ничего не двигает.',
      'Короткие строки вроде кнопок, пунктов меню и подписей в основном меняются по ширине, а длинные абзацы чаще меняются по высоте из-за других переносов строк.',
    ],
    items: [
      'Совпадение ширины каждого глифа',
      'Совпадение верхнего и нижнего выносов',
      'Одинаковый межстрочный зазор',
      'Измерение результата',
    ],
    subheading: 'Цитата для переноса',
    quote:
      'Съешь же ещё этих мягких французских булок да выпей чаю, пока шустрая лиса прыгает через ленивую собаку.',
    buttons: ['Скачать', 'Подробнее', 'Войти'],
  },
};
