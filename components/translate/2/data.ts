export type LanguageColumn = {
  id: string;
  label: string;
  nativeLabel: string;
  dir?: "ltr" | "rtl";
};

export type ConversationRow = {
  id: string;
  source: string;
};

export const languages = [
  { id: "ko", label: "Korean", nativeLabel: "한국어" },
  { id: "ja", label: "Japanese", nativeLabel: "日本語" },
  { id: "en", label: "English", nativeLabel: "English" },
  { id: "zh", label: "Chinese", nativeLabel: "中文" },
  { id: "fr", label: "French", nativeLabel: "Français" },
  { id: "es", label: "Spanish", nativeLabel: "Español" },
  { id: "de", label: "German", nativeLabel: "Deutsch" },
  { id: "ar", label: "Arabic", nativeLabel: "العربية", dir: "rtl" },
  { id: "hi", label: "Hindi", nativeLabel: "हिन्दी" },
  { id: "vi", label: "Vietnamese", nativeLabel: "Tiếng Việt" },
  { id: "ru", label: "Russian", nativeLabel: "Русский" },
  { id: "pt", label: "Portuguese", nativeLabel: "Português" },
  { id: "it", label: "Italian", nativeLabel: "Italiano" },
  { id: "th", label: "Thai", nativeLabel: "ไทย" },
  { id: "id", label: "Indonesian", nativeLabel: "Indonesia" },
  { id: "tr", label: "Turkish", nativeLabel: "Türkçe" },
  { id: "nl", label: "Dutch", nativeLabel: "Nederlands" },
  { id: "sv", label: "Swedish", nativeLabel: "Svenska" },
  { id: "pl", label: "Polish", nativeLabel: "Polski" },
  { id: "el", label: "Greek", nativeLabel: "Ελληνικά" },
] as const satisfies readonly LanguageColumn[];

export const conversations = [
  { id: "c01", source: "문장이 하나씩 들어온다." },
  { id: "c02", source: "번역은 아직 끝나지 않았다." },
  { id: "c03", source: "화면은 조용히 말을 바꾼다." },
  { id: "c04", source: "나는 원문을 다시 확인한다." },
  { id: "c05", source: "기계는 망설임을 표시하지 않는다." },
  { id: "c06", source: "뜻은 남고 어순은 이동한다." },
  { id: "c07", source: "짧은 문장이 가장 오래 걸린다." },
  { id: "c08", source: "상태값은 감정을 흉내 낸다." },
  { id: "c09", source: "커서는 다음 행에 머문다." },
  { id: "c10", source: "오역은 아주 자연스럽게 보인다." },
  { id: "c11", source: "말투가 바뀌면 사람도 바뀐다." },
  { id: "c12", source: "나는 결과보다 간격을 읽는다." },
  { id: "c13", source: "번역된 문장은 조금 늦게 도착한다." },
  { id: "c14", source: "언어는 표처럼 정렬된다." },
  { id: "c15", source: "대화는 열을 따라 흩어진다." },
  { id: "c16", source: "같은 말이 다른 속도로 빛난다." },
  { id: "c17", source: "이 화면은 말하지 않고 응답한다." },
  { id: "c18", source: "마우스는 문장의 범위를 정한다." },
  { id: "c19", source: "이전 행들이 다시 나타난다." },
  { id: "c20", source: "마지막 문장은 처음으로 돌아간다." },
] as const satisfies readonly ConversationRow[];

const columns: Record<(typeof languages)[number]["id"], readonly string[]> = {
  ko: conversations.map((item) => item.source),
  ja: [
    "文章がひとつずつ入ってくる。", "翻訳はまだ終わっていない。", "画面は静かに言葉を変える。", "私は原文をもう一度確認する。", "機械はためらいを表示しない。",
    "意味は残り、語順は移動する。", "短い文がいちばん時間を取る。", "状態値は感情をまねる。", "カーソルは次の行に留まる。", "誤訳はとても自然に見える。",
    "口調が変わると人も変わる。", "私は結果より間隔を読む。", "翻訳された文は少し遅れて届く。", "言語は表のように整列する。", "会話は列に沿って散らばる。",
    "同じ言葉が別の速度で光る。", "この画面は話さずに応答する。", "マウスは文の範囲を決める。", "前の行がまた現れる。", "最後の文は最初に戻る。",
  ],
  en: [
    "Sentences enter one by one.", "The translation is not finished yet.", "The screen quietly changes the wording.", "I check the original again.", "The machine does not show hesitation.",
    "Meaning remains while word order moves.", "The short sentence takes the longest.", "The status value imitates feeling.", "The cursor rests on the next row.", "The mistranslation looks very natural.",
    "When tone changes, the person changes too.", "I read the interval more than the result.", "The translated sentence arrives a little late.", "Languages align like a table.", "Conversation scatters along columns.",
    "The same phrase shines at another speed.", "This screen responds without speaking.", "The mouse decides the range of the sentence.", "Previous rows appear again.", "The last sentence returns to the first.",
  ],
  zh: [
    "句子一个接一个进入。", "翻译还没有结束。", "屏幕安静地改变措辞。", "我再次确认原文。", "机器不显示犹豫。",
    "意义留下，语序移动。", "短句花的时间最长。", "状态值模仿情绪。", "光标停在下一行。", "误译看起来非常自然。",
    "语气改变，人也改变。", "我读到的是间隔而不是结果。", "译文稍晚抵达。", "语言像表格一样排列。", "对话沿着列散开。",
    "同一句话以不同速度发光。", "这个屏幕不说话也会回应。", "鼠标决定句子的范围。", "前面的行再次出现。", "最后一句回到第一句。",
  ],
  fr: [
    "Les phrases arrivent une par une.", "La traduction n'est pas encore terminée.", "L'écran change doucement les mots.", "Je vérifie encore le texte source.", "La machine n'affiche aucune hésitation.",
    "Le sens reste, l'ordre se déplace.", "La phrase courte prend le plus de temps.", "L'état imite une émotion.", "Le curseur reste sur la ligne suivante.", "La mauvaise traduction paraît naturelle.",
    "Quand le ton change, la personne change aussi.", "Je lis l'intervalle plus que le résultat.", "La phrase traduite arrive un peu tard.", "Les langues s'alignent comme un tableau.", "La conversation se disperse en colonnes.",
    "La même phrase brille à une autre vitesse.", "Cet écran répond sans parler.", "La souris décide de la portée de la phrase.", "Les lignes précédentes réapparaissent.", "La dernière phrase revient à la première.",
  ],
  es: [
    "Las frases entran una por una.", "La traducción aún no ha terminado.", "La pantalla cambia las palabras en silencio.", "Vuelvo a revisar el original.", "La máquina no muestra duda.",
    "El sentido queda y el orden se mueve.", "La frase corta tarda más.", "El estado imita una emoción.", "El cursor permanece en la siguiente fila.", "La mala traducción parece natural.",
    "Cuando cambia el tono, cambia la persona.", "Leo el intervalo más que el resultado.", "La frase traducida llega un poco tarde.", "Los idiomas se alinean como una tabla.", "La conversación se dispersa por columnas.",
    "La misma frase brilla a otra velocidad.", "Esta pantalla responde sin hablar.", "El ratón decide el rango de la frase.", "Las filas anteriores aparecen de nuevo.", "La última frase vuelve a la primera.",
  ],
  de: [
    "Sätze treten einer nach dem anderen ein.", "Die Übersetzung ist noch nicht beendet.", "Der Bildschirm verändert leise die Wörter.", "Ich prüfe den Ursprungstext erneut.", "Die Maschine zeigt kein Zögern.",
    "Der Sinn bleibt, die Wortfolge wandert.", "Der kurze Satz dauert am längsten.", "Der Statuswert ahmt Gefühl nach.", "Der Cursor bleibt in der nächsten Zeile.", "Die Fehlübersetzung wirkt natürlich.",
    "Wenn der Ton sich ändert, ändert sich auch die Person.", "Ich lese eher den Abstand als das Ergebnis.", "Der übersetzte Satz kommt etwas spät an.", "Sprachen ordnen sich wie eine Tabelle.", "Das Gespräch zerstreut sich entlang der Spalten.",
    "Derselbe Satz leuchtet in anderer Geschwindigkeit.", "Dieser Bildschirm antwortet ohne zu sprechen.", "Die Maus bestimmt den Satzbereich.", "Frühere Zeilen erscheinen wieder.", "Der letzte Satz kehrt zum ersten zurück.",
  ],
  ar: [
    "تدخل الجمل واحدة تلو الأخرى.", "لم تكتمل الترجمة بعد.", "تغيّر الشاشة الكلام بهدوء.", "أراجع النص الأصلي مرة أخرى.", "لا تعرض الآلة أي تردد.",
    "يبقى المعنى ويتحرك ترتيب الكلمات.", "الجملة القصيرة تستغرق الوقت الأطول.", "قيمة الحالة تقلد الشعور.", "يبقى المؤشر عند السطر التالي.", "تبدو الترجمة الخاطئة طبيعية جدا.",
    "عندما تتغير النبرة يتغير الشخص أيضا.", "أقرأ الفاصل أكثر من النتيجة.", "تصل الجملة المترجمة متأخرة قليلا.", "تنتظم اللغات مثل جدول.", "يتناثر الحوار على امتداد الأعمدة.",
    "تضيء العبارة نفسها بسرعة أخرى.", "تستجيب هذه الشاشة من دون أن تتكلم.", "يحدد المؤشر نطاق الجملة.", "تظهر السطور السابقة من جديد.", "تعود الجملة الأخيرة إلى الأولى.",
  ],
  hi: [
    "वाक्य एक-एक करके आते हैं।", "अनुवाद अभी पूरा नहीं हुआ है।", "स्क्रीन चुपचाप शब्द बदलती है।", "मैं मूल पाठ फिर से जांचता हूं।", "मशीन झिझक नहीं दिखाती।",
    "अर्थ बचा रहता है और शब्द-क्रम खिसकता है।", "छोटा वाक्य सबसे अधिक समय लेता है।", "स्थिति मान भावना की नकल करता है।", "कर्सर अगली पंक्ति पर ठहरता है।", "गलत अनुवाद बहुत स्वाभाविक दिखता है।",
    "लहजा बदलता है तो व्यक्ति भी बदलता है।", "मैं परिणाम से अधिक अंतराल पढ़ता हूं।", "अनूदित वाक्य थोड़ा देर से पहुंचता है।", "भाषाएं तालिका की तरह पंक्तिबद्ध होती हैं।", "बातचीत स्तंभों के साथ बिखरती है।",
    "वही वाक्य दूसरी गति से चमकता है।", "यह स्क्रीन बोले बिना जवाब देती है।", "माउस वाक्य की सीमा तय करता है।", "पिछली पंक्तियां फिर दिखाई देती हैं।", "आखिरी वाक्य पहले पर लौटता है।",
  ],
  vi: [
    "Các câu đi vào từng câu một.", "Bản dịch vẫn chưa kết thúc.", "Màn hình lặng lẽ đổi lời.", "Tôi kiểm tra lại văn bản gốc.", "Cỗ máy không hiển thị sự do dự.",
    "Ý nghĩa còn lại và trật tự từ dịch chuyển.", "Câu ngắn mất nhiều thời gian nhất.", "Giá trị trạng thái bắt chước cảm xúc.", "Con trỏ dừng ở hàng tiếp theo.", "Bản dịch sai trông rất tự nhiên.",
    "Khi giọng điệu đổi, con người cũng đổi.", "Tôi đọc khoảng cách nhiều hơn kết quả.", "Câu đã dịch đến hơi muộn.", "Ngôn ngữ được xếp như một bảng.", "Cuộc trò chuyện tản ra theo các cột.",
    "Cùng một câu sáng lên ở tốc độ khác.", "Màn hình này đáp lại mà không nói.", "Chuột quyết định phạm vi của câu.", "Những hàng trước hiện ra lần nữa.", "Câu cuối quay về câu đầu.",
  ],
  ru: [
    "Предложения входят одно за другим.", "Перевод еще не завершен.", "Экран тихо меняет слова.", "Я снова сверяю исходный текст.", "Машина не показывает колебаний.",
    "Смысл остается, а порядок слов сдвигается.", "Короткое предложение занимает больше всего времени.", "Значение состояния имитирует чувство.", "Курсор остается на следующей строке.", "Ошибочный перевод выглядит очень естественно.",
    "Когда меняется тон, меняется и человек.", "Я читаю интервал больше, чем результат.", "Переведенное предложение приходит немного поздно.", "Языки выстраиваются как таблица.", "Разговор рассыпается вдоль столбцов.",
    "Одна и та же фраза светится с другой скоростью.", "Этот экран отвечает, не говоря.", "Мышь определяет границы предложения.", "Предыдущие строки появляются снова.", "Последнее предложение возвращается к первому.",
  ],
  pt: [
    "As frases entram uma por uma.", "A tradução ainda não terminou.", "A tela muda as palavras em silêncio.", "Eu confiro o original novamente.", "A máquina não mostra hesitação.",
    "O sentido permanece e a ordem das palavras se move.", "A frase curta leva mais tempo.", "O valor de estado imita uma emoção.", "O cursor fica na próxima linha.", "A tradução errada parece muito natural.",
    "Quando o tom muda, a pessoa também muda.", "Leio o intervalo mais do que o resultado.", "A frase traduzida chega um pouco tarde.", "As línguas se alinham como uma tabela.", "A conversa se dispersa pelas colunas.",
    "A mesma frase brilha em outra velocidade.", "Esta tela responde sem falar.", "O mouse decide o alcance da frase.", "As linhas anteriores aparecem de novo.", "A última frase retorna à primeira.",
  ],
  it: [
    "Le frasi entrano una alla volta.", "La traduzione non è ancora finita.", "Lo schermo cambia le parole in silenzio.", "Controllo di nuovo il testo originale.", "La macchina non mostra esitazione.",
    "Il senso resta e l'ordine delle parole si sposta.", "La frase breve richiede più tempo.", "Il valore di stato imita un'emozione.", "Il cursore resta sulla riga successiva.", "La traduzione sbagliata sembra molto naturale.",
    "Quando cambia il tono, cambia anche la persona.", "Leggo l'intervallo più del risultato.", "La frase tradotta arriva un po' tardi.", "Le lingue si allineano come una tabella.", "La conversazione si disperde lungo le colonne.",
    "La stessa frase brilla a un'altra velocità.", "Questo schermo risponde senza parlare.", "Il mouse decide l'estensione della frase.", "Le righe precedenti appaiono di nuovo.", "L'ultima frase ritorna alla prima.",
  ],
  th: [
    "ประโยคเข้ามาทีละประโยค", "การแปลยังไม่เสร็จสิ้น", "หน้าจอเปลี่ยนถ้อยคำอย่างเงียบๆ", "ฉันตรวจสอบต้นฉบับอีกครั้ง", "เครื่องไม่แสดงความลังเล",
    "ความหมายยังอยู่ แต่ลำดับคำเคลื่อนย้าย", "ประโยคสั้นใช้เวลานานที่สุด", "ค่าสถานะเลียนแบบความรู้สึก", "เคอร์เซอร์หยุดอยู่ที่แถวถัดไป", "คำแปลผิดดูเป็นธรรมชาติมาก",
    "เมื่อน้ำเสียงเปลี่ยน คนก็เปลี่ยนด้วย", "ฉันอ่านช่องว่างมากกว่าผลลัพธ์", "ประโยคที่แปลมาถึงช้าเล็กน้อย", "ภาษาถูกจัดเรียงเหมือนตาราง", "บทสนทนากระจายไปตามคอลัมน์",
    "ประโยคเดิมสว่างขึ้นด้วยความเร็วอีกแบบ", "หน้าจอนี้ตอบสนองโดยไม่พูด", "เมาส์กำหนดขอบเขตของประโยค", "แถวก่อนหน้าปรากฏขึ้นอีกครั้ง", "ประโยคสุดท้ายกลับไปยังประโยคแรก",
  ],
  id: [
    "Kalimat masuk satu per satu.", "Terjemahannya belum selesai.", "Layar diam-diam mengubah kata-kata.", "Saya memeriksa teks asli sekali lagi.", "Mesin tidak menampilkan keraguan.",
    "Makna tetap ada dan urutan kata bergeser.", "Kalimat pendek memakan waktu paling lama.", "Nilai status meniru perasaan.", "Kursor berhenti di baris berikutnya.", "Terjemahan yang salah terlihat sangat alami.",
    "Ketika nada berubah, orangnya juga berubah.", "Saya membaca jeda lebih daripada hasilnya.", "Kalimat terjemahan tiba sedikit terlambat.", "Bahasa berjajar seperti tabel.", "Percakapan tersebar sepanjang kolom.",
    "Frasa yang sama menyala dengan kecepatan lain.", "Layar ini merespons tanpa berbicara.", "Mouse menentukan rentang kalimat.", "Baris sebelumnya muncul lagi.", "Kalimat terakhir kembali ke yang pertama.",
  ],
  tr: [
    "Cümleler tek tek içeri girer.", "Çeviri henüz bitmedi.", "Ekran sözcükleri sessizce değiştirir.", "Özgün metni yeniden kontrol ederim.", "Makine tereddüt göstermez.",
    "Anlam kalır, sözcük sırası yer değiştirir.", "Kısa cümle en uzun zamanı alır.", "Durum değeri duyguyu taklit eder.", "İmleç sonraki satırda kalır.", "Yanlış çeviri çok doğal görünür.",
    "Ton değişince kişi de değişir.", "Sonuçtan çok aralığı okurum.", "Çevrilmiş cümle biraz geç gelir.", "Diller bir tablo gibi hizalanır.", "Konuşma sütunlar boyunca dağılır.",
    "Aynı ifade başka bir hızda parlar.", "Bu ekran konuşmadan yanıt verir.", "Fare cümlenin aralığını belirler.", "Önceki satırlar yeniden görünür.", "Son cümle ilkine döner.",
  ],
  nl: [
    "Zinnen komen een voor een binnen.", "De vertaling is nog niet klaar.", "Het scherm verandert stil de woorden.", "Ik controleer de brontekst opnieuw.", "De machine toont geen aarzeling.",
    "De betekenis blijft en de woordvolgorde verschuift.", "De korte zin duurt het langst.", "De statuswaarde bootst gevoel na.", "De cursor blijft op de volgende regel.", "De verkeerde vertaling lijkt heel natuurlijk.",
    "Als de toon verandert, verandert de persoon ook.", "Ik lees eerder de tussenruimte dan het resultaat.", "De vertaalde zin komt iets te laat aan.", "Talen lijnen uit als een tabel.", "Het gesprek verspreidt zich langs kolommen.",
    "Dezelfde zin licht op met een andere snelheid.", "Dit scherm antwoordt zonder te spreken.", "De muis bepaalt het bereik van de zin.", "Vorige regels verschijnen opnieuw.", "De laatste zin keert terug naar de eerste.",
  ],
  sv: [
    "Meningar kommer in en efter en.", "Översättningen är inte färdig än.", "Skärmen ändrar orden tyst.", "Jag kontrollerar originaltexten igen.", "Maskinen visar ingen tvekan.",
    "Betydelsen blir kvar och ordföljden flyttar sig.", "Den korta meningen tar längst tid.", "Statusvärdet härmar en känsla.", "Markören stannar på nästa rad.", "Felöversättningen ser mycket naturlig ut.",
    "När tonen ändras ändras personen också.", "Jag läser mellanrummet mer än resultatet.", "Den översatta meningen kommer lite sent.", "Språken radar upp sig som en tabell.", "Samtalet sprids längs kolumnerna.",
    "Samma fras lyser i en annan hastighet.", "Den här skärmen svarar utan att tala.", "Musen bestämmer meningens räckvidd.", "Tidigare rader visas igen.", "Den sista meningen återvänder till den första.",
  ],
  pl: [
    "Zdania wchodzą jedno po drugim.", "Tłumaczenie jeszcze się nie skończyło.", "Ekran cicho zmienia słowa.", "Ponownie sprawdzam tekst źródłowy.", "Maszyna nie pokazuje wahania.",
    "Znaczenie zostaje, a szyk słów się przesuwa.", "Krótkie zdanie zajmuje najwięcej czasu.", "Wartość stanu naśladuje uczucie.", "Kursor zatrzymuje się w następnym wierszu.", "Błędne tłumaczenie wygląda bardzo naturalnie.",
    "Gdy zmienia się ton, zmienia się też osoba.", "Czytam odstęp bardziej niż wynik.", "Przetłumaczone zdanie przychodzi trochę późno.", "Języki ustawiają się jak tabela.", "Rozmowa rozprasza się wzdłuż kolumn.",
    "Ta sama fraza świeci z inną prędkością.", "Ten ekran odpowiada bez mówienia.", "Mysz wyznacza zakres zdania.", "Poprzednie wiersze pojawiają się znowu.", "Ostatnie zdanie wraca do pierwszego.",
  ],
  el: [
    "Οι προτάσεις μπαίνουν μία μία.", "Η μετάφραση δεν έχει τελειώσει ακόμη.", "Η οθόνη αλλάζει ήσυχα τις λέξεις.", "Ελέγχω ξανά το αρχικό κείμενο.", "Η μηχανή δεν δείχνει δισταγμό.",
    "Το νόημα μένει και η σειρά των λέξεων μετακινείται.", "Η σύντομη πρόταση παίρνει τον περισσότερο χρόνο.", "Η τιμή κατάστασης μιμείται συναίσθημα.", "Ο δείκτης μένει στην επόμενη γραμμή.", "Η λάθος μετάφραση φαίνεται πολύ φυσική.",
    "Όταν αλλάζει ο τόνος, αλλάζει και το πρόσωπο.", "Διαβάζω το διάστημα περισσότερο από το αποτέλεσμα.", "Η μεταφρασμένη πρόταση φτάνει λίγο αργά.", "Οι γλώσσες ευθυγραμμίζονται σαν πίνακας.", "Η συνομιλία σκορπίζεται κατά μήκος των στηλών.",
    "Η ίδια φράση λάμπει με άλλη ταχύτητα.", "Αυτή η οθόνη απαντά χωρίς να μιλά.", "Το ποντίκι ορίζει το εύρος της πρότασης.", "Οι προηγούμενες γραμμές εμφανίζονται ξανά.", "Η τελευταία πρόταση επιστρέφει στην πρώτη.",
  ],
};

export function getCellText(languageId: (typeof languages)[number]["id"], rowIndex: number) {
  return columns[languageId][rowIndex] ?? "";
}

export const matrix = conversations.map((_, rowIndex) =>
  languages.map((language) => getCellText(language.id, rowIndex)),
);
