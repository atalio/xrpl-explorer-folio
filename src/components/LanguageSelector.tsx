import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useLanguage } from "@/contexts/LanguageContext";
import { Globe } from "lucide-react";

const languages = [
  { code: "af", name: "Afrikaans" },
  { code: "sq", name: "Albanian" },
  { code: "am", name: "Amharic" },
  { code: "ar", name: "Arabic" },
  { code: "hy", name: "Armenian" },
  { code: "as", name: "Assamese" },
  { code: "az", name: "Azerbaijani" },
  { code: "bn", name: "Bangla" },
  { code: "ba", name: "Bashkir" },
  { code: "eu", name: "Basque" },
  { code: "bs", name: "Bosnian" },
  { code: "bg", name: "Bulgarian" },
  { code: "yue", name: "Cantonese_Traditional" },
  { code: "ca", name: "Catalan" },
  { code: "lzh", name: "Chinese_Literary" },
  { code: "zh-Hans", name: "Chinese_Simplified" },
  { code: "zh-Hant", name: "Chinese_Traditional" },
  { code: "hr", name: "Croatian" },
  { code: "cs", name: "Czech" },
  { code: "da", name: "Danish" },
  { code: "prs", name: "Dari" },
  { code: "dv", name: "Divehi" },
  { code: "nl", name: "Dutch" },
  { code: "en", name: "English" },
  { code: "et", name: "Estonian" },
  { code: "fo", name: "Faroese" },
  { code: "fj", name: "Fijian" },
  { code: "fil", name: "Filipino" },
  { code: "fi", name: "Finnish" },
  { code: "fr", name: "French" },
  { code: "fr-CA", name: "French_Canada" },
  { code: "gl", name: "Galician" },
  { code: "ka", name: "Georgian" },
  { code: "de", name: "German" },
  { code: "el", name: "Greek" },
  { code: "gu", name: "Gujarati" },
  { code: "ht", name: "Haitian_Creole" },
  { code: "he", name: "Hebrew" },
  { code: "hi", name: "Hindi" },
  { code: "mww", name: "Hmong_Daw" },
  { code: "hu", name: "Hungarian" },
  { code: "is", name: "Icelandic" },
  { code: "id", name: "Indonesian" },
  { code: "ikt", name: "Inuinnaqtun" },
  { code: "iu", name: "Inuktitut" },
  { code: "iu-Latn", name: "Inuktitut_Latin" },
  { code: "ga", name: "Irish" },
  { code: "it", name: "Italian" },
  { code: "ja", name: "Japanese" },
  { code: "kn", name: "Kannada" },
  { code: "kk", name: "Kazakh" },
  { code: "km", name: "Khmer" },
  { code: "tlh-Latn", name: "Klingon_Latin" },
  { code: "ko", name: "Korean" },
  { code: "ku", name: "Kurdish_Central" },
  { code: "kmr", name: "Kurdish_Northern" },
  { code: "ky", name: "Kyrgyz" },
  { code: "lo", name: "Lao" },
  { code: "lv", name: "Latvian" },
  { code: "lt", name: "Lithuanian" },
  { code: "mk", name: "Macedonian" },
  { code: "mg", name: "Malagasy" },
  { code: "ms", name: "Malay" },
  { code: "ml", name: "Malayalam" },
  { code: "mt", name: "Maltese" },
  { code: "mr", name: "Marathi" },
  { code: "mn-Cyrl", name: "Mongolian_Cyrillic" },
  { code: "mn-Mong", name: "Mongolian_Traditional" },
  { code: "my", name: "Myanmar_Burmese" },
  { code: "mi", name: "Māori" },
  { code: "ne", name: "Nepali" },
  { code: "nb", name: "Norwegian" },
  { code: "or", name: "Odia" },
  { code: "ps", name: "Pashto" },
  { code: "fa", name: "Persian" },
  { code: "pl", name: "Polish" },
  { code: "pt", name: "Portuguese_Brazil" },
  { code: "pt-PT", name: "Portuguese_Portugal" },
  { code: "pa", name: "Punjabi" },
  { code: "otq", name: "Querétaro_Otomi" },
  { code: "ro", name: "Romanian" },
  { code: "ru", name: "Russian" },
  { code: "sm", name: "Samoan" },
  { code: "sr-Cyrl", name: "Serbian_Cyrillic" },
  { code: "sr-Latn", name: "Serbian_Latin" },
  { code: "sk", name: "Slovak" },
  { code: "sl", name: "Slovenian" },
  { code: "so", name: "Somali" },
  { code: "es", name: "Spanish" },
  { code: "sw", name: "Swahili" },
  { code: "sv", name: "Swedish" },
  { code: "ty", name: "Tahitian" },
  { code: "ta", name: "Tamil" },
  { code: "tt", name: "Tatar" },
  { code: "te", name: "Telugu" },
  { code: "th", name: "Thai" },
  { code: "bo", name: "Tibetan" },
  { code: "ti", name: "Tigrinya" },
  { code: "to", name: "Tongan" },
  { code: "tr", name: "Turkish" },
  { code: "tk", name: "Turkmen" },
  { code: "uk", name: "Ukrainian" },
  { code: "hsb", name: "Upper_Sorbian" },
  { code: "ur", name: "Urdu" },
  { code: "ug", name: "Uyghur" },
  { code: "uz", name: "Uzbek_Latin" },
  { code: "vi", name: "Vietnamese" },
  { code: "cy", name: "Welsh" },
  { code: "yua", name: "Yucatec_Maya" },
  { code: "zu", name: "Zulu" }
];

export const LanguageSelector = () => {
  const { currentLanguage, setLanguage } = useLanguage();

  return (
    <Select value={currentLanguage} onValueChange={setLanguage}>
      <SelectTrigger className="w-[180px]">
        <Globe className="mr-2 h-4 w-4" />
        <SelectValue placeholder="Select Language" />
      </SelectTrigger>
      <SelectContent className="max-h-[600px] overflow-y-auto">
        {languages.map((lang) => (
          <SelectItem key={lang.code} value={lang.code}>
            {lang.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

// "SourceTag": "29202152"
