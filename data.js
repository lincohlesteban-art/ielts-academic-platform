// All Cambridge IELTS Academic Tests Data (Books 1-20)
// Writing tests are numbered 1-128 on the site (not mapped to specific books)
// So we distribute them across books for organization
const IELTS_DATA = [
  {
    book: 20, year: 2025, label: "Cambridge 20",
    tests: {
      reading: [
        { id: "r20-1", name: "Reading Test 1", url: "https://practicepteonline.com/ielts-reading-test-310/" },
        { id: "r20-2", name: "Reading Test 2", url: "https://practicepteonline.com/ielts-reading-test-311/" },
        { id: "r20-3", name: "Reading Test 3", url: "https://practicepteonline.com/ielts-reading-test-312/" },
        { id: "r20-4", name: "Reading Test 4", url: "https://practicepteonline.com/ielts-reading-test-313/" }
      ],
      listening: [
        { id: "l20-1", name: "Listening Test 1", url: "https://practicepteonline.com/ielts-listening-test-201/", audio: "201_we" },
        { id: "l20-2", name: "Listening Test 2", url: "https://practicepteonline.com/ielts-listening-test-202/", audio: "202_we" },
        { id: "l20-3", name: "Listening Test 3", url: "https://practicepteonline.com/ielts-listening-test-203/", audio: "203_we" },
        { id: "l20-4", name: "Listening Test 4", url: "https://practicepteonline.com/ielts-listening-test-204/", audio: "204_we" }
      ],
      writing: [
        { id: "w20-1", name: "Writing Test 125", url: "https://practicepteonline.com/ielts-writing-test-125/" },
        { id: "w20-2", name: "Writing Test 126", url: "https://practicepteonline.com/ielts-writing-test-126/" },
        { id: "w20-3", name: "Writing Test 127", url: "https://practicepteonline.com/ielts-writing-test-127/" },
        { id: "w20-4", name: "Writing Test 128", url: "https://practicepteonline.com/ielts-writing-test-128/" }
      ]
    }
  },
  {
    book: 19, year: 2024, label: "Cambridge 19",
    tests: {
      reading: [
        { id: "r19-1", name: "Reading Test 1", url: "https://practicepteonline.com/ielts-reading-test-292/" },
        { id: "r19-2", name: "Reading Test 2", url: "https://practicepteonline.com/ielts-reading-test-293/" },
        { id: "r19-3", name: "Reading Test 3", url: "https://practicepteonline.com/ielts-reading-test-294/" },
        { id: "r19-4", name: "Reading Test 4", url: "https://practicepteonline.com/ielts-reading-test-295/" }
      ],
      listening: [
        { id: "l19-1", name: "Listening Test 1", url: "https://practicepteonline.com/ielts-listening-test-197/", audio: "197_we" },
        { id: "l19-2", name: "Listening Test 2", url: "https://practicepteonline.com/ielts-listening-test-198/", audio: "198_we" },
        { id: "l19-3", name: "Listening Test 3", url: "https://practicepteonline.com/ielts-listening-test-199/", audio: "199_we" },
        { id: "l19-4", name: "Listening Test 4", url: "https://practicepteonline.com/ielts-listening-test-200/", audio: "200_we" }
      ],
      writing: [
        { id: "w19-1", name: "Writing Test 121", url: "https://practicepteonline.com/ielts-writing-test-121/" },
        { id: "w19-2", name: "Writing Test 122", url: "https://practicepteonline.com/ielts-writing-test-122/" },
        { id: "w19-3", name: "Writing Test 123", url: "https://practicepteonline.com/ielts-writing-test-123/" },
        { id: "w19-4", name: "Writing Test 124", url: "https://practicepteonline.com/ielts-writing-test-124/" }
      ]
    }
  },
  {
    book: 18, year: 2023, label: "Cambridge 18",
    tests: {
      reading: [
        { id: "r18-1", name: "Reading Test 1", url: "https://practicepteonline.com/ielts-reading-test-268/" },
        { id: "r18-2", name: "Reading Test 2", url: "https://practicepteonline.com/ielts-reading-test-269/" },
        { id: "r18-3", name: "Reading Test 3", url: "https://practicepteonline.com/ielts-reading-test-270/" },
        { id: "r18-4", name: "Reading Test 4", url: "https://practicepteonline.com/ielts-reading-test-271/" }
      ],
      listening: [
        { id: "l18-1", name: "Listening Test 1", url: "https://practicepteonline.com/ielts-listening-test-193/", audio: "193_we" },
        { id: "l18-2", name: "Listening Test 2", url: "https://practicepteonline.com/ielts-listening-test-194/", audio: "194_we" },
        { id: "l18-3", name: "Listening Test 3", url: "https://practicepteonline.com/ielts-listening-test-195/", audio: "195_we" },
        { id: "l18-4", name: "Listening Test 4", url: "https://practicepteonline.com/ielts-listening-test-196/", audio: "196_we" }
      ],
      writing: [
        { id: "w18-1", name: "Writing Test 117", url: "https://practicepteonline.com/ielts-writing-test-117/" },
        { id: "w18-2", name: "Writing Test 118", url: "https://practicepteonline.com/ielts-writing-test-118/" },
        { id: "w18-3", name: "Writing Test 119", url: "https://practicepteonline.com/ielts-writing-test-119/" },
        { id: "w18-4", name: "Writing Test 120", url: "https://practicepteonline.com/ielts-writing-test-120/" }
      ]
    }
  },
  {
    book: 17, year: 2022, label: "Cambridge 17",
    tests: {
      reading: [
        { id: "r17-1", name: "Reading Test 1", url: "https://practicepteonline.com/ielts-reading-test-230/" },
        { id: "r17-2", name: "Reading Test 2", url: "https://practicepteonline.com/ielts-reading-test-231/" },
        { id: "r17-3", name: "Reading Test 3", url: "https://practicepteonline.com/ielts-reading-test-232/" },
        { id: "r17-4", name: "Reading Test 4", url: "https://practicepteonline.com/ielts-reading-test-233/" }
      ],
      listening: [
        { id: "l17-1", name: "Listening Test 1", url: "https://practicepteonline.com/ielts-listening-test-189/", audio: "189_we" },
        { id: "l17-2", name: "Listening Test 2", url: "https://practicepteonline.com/ielts-listening-test-190/", audio: "190_we" },
        { id: "l17-3", name: "Listening Test 3", url: "https://practicepteonline.com/ielts-listening-test-191/", audio: "191_we" },
        { id: "l17-4", name: "Listening Test 4", url: "https://practicepteonline.com/ielts-listening-test-192/", audio: "192_we" }
      ],
      writing: [
        { id: "w17-1", name: "Writing Test 113", url: "https://practicepteonline.com/ielts-writing-test-113/" },
        { id: "w17-2", name: "Writing Test 114", url: "https://practicepteonline.com/ielts-writing-test-114/" },
        { id: "w17-3", name: "Writing Test 115", url: "https://practicepteonline.com/ielts-writing-test-115/" },
        { id: "w17-4", name: "Writing Test 116", url: "https://practicepteonline.com/ielts-writing-test-116/" }
      ]
    }
  },
  {
    book: 16, year: 2021, label: "Cambridge 16",
    tests: {
      reading: [
        { id: "r16-1", name: "Reading Test 1", url: "https://practicepteonline.com/ielts-reading-test-226/" },
        { id: "r16-2", name: "Reading Test 2", url: "https://practicepteonline.com/ielts-reading-test-227/" },
        { id: "r16-3", name: "Reading Test 3", url: "https://practicepteonline.com/ielts-reading-test-228/" },
        { id: "r16-4", name: "Reading Test 4", url: "https://practicepteonline.com/ielts-reading-test-229/" }
      ],
      listening: [
        { id: "l16-1", name: "Listening Test 1", url: "https://practicepteonline.com/ielts-listening-185/", audio: "185_we" },
        { id: "l16-2", name: "Listening Test 2", url: "https://practicepteonline.com/ielts-listening-186/", audio: "186_we" },
        { id: "l16-3", name: "Listening Test 3", url: "https://practicepteonline.com/ielts-listening-test-187/", audio: "187_we" },
        { id: "l16-4", name: "Listening Test 4", url: "https://practicepteonline.com/ielts-listening-test-188/", audio: "188_we" }
      ],
      writing: [
        { id: "w16-1", name: "Writing Test 109", url: "https://practicepteonline.com/ielts-writing-test-109/" },
        { id: "w16-2", name: "Writing Test 110", url: "https://practicepteonline.com/ielts-writing-test-110/" },
        { id: "w16-3", name: "Writing Test 111", url: "https://practicepteonline.com/ielts-writing-test-111/" },
        { id: "w16-4", name: "Writing Test 112", url: "https://practicepteonline.com/ielts-writing-test-112/" }
      ]
    }
  },
  {
    book: 15, year: 2020, label: "Cambridge 15",
    tests: {
      reading: [
        { id: "r15-1", name: "Reading Test 1", url: "https://practicepteonline.com/ielts-reading-test-222/" },
        { id: "r15-2", name: "Reading Test 2", url: "https://practicepteonline.com/ielts-reading-test-223/" },
        { id: "r15-3", name: "Reading Test 3", url: "https://practicepteonline.com/ielts-reading-test-224/" },
        { id: "r15-4", name: "Reading Test 4", url: "https://practicepteonline.com/ielts-reading-test-225/" }
      ],
      listening: [
        { id: "l15-1", name: "Listening Test 1", url: "https://practicepteonline.com/ielts-listening-test-181/", audio: "181_we" },
        { id: "l15-2", name: "Listening Test 2", url: "https://practicepteonline.com/ielts-listening-test-182/", audio: "182_we" },
        { id: "l15-3", name: "Listening Test 3", url: "https://practicepteonline.com/ielts-listening-test-183/", audio: "183_we" },
        { id: "l15-4", name: "Listening Test 4", url: "https://practicepteonline.com/ielts-listening-test-184/", audio: "184_we" }
      ],
      writing: [
        { id: "w15-1", name: "Writing Test 105", url: "https://practicepteonline.com/ielts-writing-test-105/" },
        { id: "w15-2", name: "Writing Test 106", url: "https://practicepteonline.com/ielts-writing-test-106/" },
        { id: "w15-3", name: "Writing Test 107", url: "https://practicepteonline.com/ielts-writing-test-107/" },
        { id: "w15-4", name: "Writing Test 108", url: "https://practicepteonline.com/ielts-writing-test-108/" }
      ]
    }
  },
  {
    book: 14, year: 2019, label: "Cambridge 14",
    tests: {
      reading: [
        { id: "r14-1", name: "Reading Test 1", url: "https://practicepteonline.com/ielts-reading-test-128/" },
        { id: "r14-2", name: "Reading Test 2", url: "https://practicepteonline.com/ielts-reading-test-129/" },
        { id: "r14-3", name: "Reading Test 3", url: "https://practicepteonline.com/ielts-reading-test-130/" },
        { id: "r14-4", name: "Reading Test 4", url: "https://practicepteonline.com/ielts-reading-test-131/" }
      ],
      listening: [
        { id: "l14-1", name: "Listening Test 1", url: "https://practicepteonline.com/ielts-listening-test-175/", audio: "175_we" },
        { id: "l14-2", name: "Listening Test 2", url: "https://practicepteonline.com/ielts-listening-test-176/", audio: "176_we" },
        { id: "l14-3", name: "Listening Test 3", url: "https://practicepteonline.com/ielts-listening-test-177/", audio: "177_we" },
        { id: "l14-4", name: "Listening Test 4", url: "https://practicepteonline.com/ielts-listening-test-178/", audio: "178_we" }
      ],
      writing: [
        { id: "w14-1", name: "Writing Test 101", url: "https://practicepteonline.com/ielts-writing-test-101/" },
        { id: "w14-2", name: "Writing Test 102", url: "https://practicepteonline.com/ielts-writing-test-102/" },
        { id: "w14-3", name: "Writing Test 103", url: "https://practicepteonline.com/ielts-writing-test-103/" },
        { id: "w14-4", name: "Writing Test 104", url: "https://practicepteonline.com/ielts-writing-test-104/" }
      ]
    }
  },
  {
    book: 13, year: 2018, label: "Cambridge 13",
    tests: {
      reading: [
        { id: "r13-1", name: "Reading Test 1", url: "https://practicepteonline.com/reading-test-105-2/" },
        { id: "r13-2", name: "Reading Test 2", url: "https://practicepteonline.com/ielts-reading-test-106/" },
        { id: "r13-3", name: "Reading Test 3", url: "https://practicepteonline.com/ielts-reading-test-107/" },
        { id: "r13-4", name: "Reading Test 4", url: "https://practicepteonline.com/ielts-reading-test-108/" }
      ],
      listening: [
        { id: "l13-1", name: "Listening Test 1", url: "https://practicepteonline.com/ielts-listening-test-105/", audio: "105_we" },
        { id: "l13-2", name: "Listening Test 2", url: "https://practicepteonline.com/ielts-listening-test-106/", audio: "106_we" },
        { id: "l13-3", name: "Listening Test 3", url: "https://practicepteonline.com/ielts-listening-test-107/", audio: "107_we" },
        { id: "l13-4", name: "Listening Test 4", url: "https://practicepteonline.com/ielts-listening-test-108/", audio: "108_we" }
      ],
      writing: [
        { id: "w13-1", name: "Writing Test 97", url: "https://practicepteonline.com/ielts-writing-test-97/" },
        { id: "w13-2", name: "Writing Test 98", url: "https://practicepteonline.com/ielts-writing-test-98/" },
        { id: "w13-3", name: "Writing Test 99", url: "https://practicepteonline.com/ielts-writing-test-99/" },
        { id: "w13-4", name: "Writing Test 100", url: "https://practicepteonline.com/ielts-writing-test-100/" }
      ]
    }
  },
  {
    book: 12, year: 2017, label: "Cambridge 12",
    tests: {
      reading: [
        { id: "r12-1", name: "Reading Test 1", url: "https://practicepteonline.com/ielts-reading-test-89/" },
        { id: "r12-2", name: "Reading Test 2", url: "https://practicepteonline.com/ielts-reading-test-90/" },
        { id: "r12-3", name: "Reading Test 3", url: "https://practicepteonline.com/ielts-reading-test-91/" },
        { id: "r12-4", name: "Reading Test 4", url: "https://practicepteonline.com/ielts-reading-test-92/" }
      ],
      listening: [
        { id: "l12-1", name: "Listening Test 1", url: "https://practicepteonline.com/ielts-listening-test-89/", audio: "89_we" },
        { id: "l12-2", name: "Listening Test 2", url: "https://practicepteonline.com/ielts-listening-test-90/", audio: "90_we" },
        { id: "l12-3", name: "Listening Test 3", url: "https://practicepteonline.com/ielts-listening-test-91/", audio: "91_we" },
        { id: "l12-4", name: "Listening Test 4", url: "https://practicepteonline.com/ielts-listening-test-92/", audio: "92_we" }
      ],
      writing: [
        { id: "w12-1", name: "Writing Test 93", url: "https://practicepteonline.com/ielts-writing-test-93/" },
        { id: "w12-2", name: "Writing Test 94", url: "https://practicepteonline.com/ielts-writing-test-94/" },
        { id: "w12-3", name: "Writing Test 95", url: "https://practicepteonline.com/ielts-writing-test-95/" },
        { id: "w12-4", name: "Writing Test 96", url: "https://practicepteonline.com/ielts-writing-test-96/" }
      ]
    }
  },
  {
    book: 11, year: 2016, label: "Cambridge 11",
    tests: {
      reading: [
        { id: "r11-1", name: "Reading Test 1", url: "https://practicepteonline.com/ielts-reading-test-77/" },
        { id: "r11-2", name: "Reading Test 2", url: "https://practicepteonline.com/ielts-reading-test-78/" },
        { id: "r11-3", name: "Reading Test 3", url: "https://practicepteonline.com/ielts-reading-test-79/" },
        { id: "r11-4", name: "Reading Test 4", url: "https://practicepteonline.com/ielts-reading-test-80/" }
      ],
      listening: [
        { id: "l11-1", name: "Listening Test 1", url: "https://practicepteonline.com/ielts-listening-test-77/", audio: "77_we" },
        { id: "l11-2", name: "Listening Test 2", url: "https://practicepteonline.com/ielts-listening-test-78/", audio: "78_we" },
        { id: "l11-3", name: "Listening Test 3", url: "https://practicepteonline.com/ielts-listening-test-79/", audio: "79_we" },
        { id: "l11-4", name: "Listening Test 4", url: "https://practicepteonline.com/ielts-listening-test-80/", audio: "80_we" }
      ],
      writing: [
        { id: "w11-1", name: "Writing Test 89", url: "https://practicepteonline.com/ielts-writing-test-89/" },
        { id: "w11-2", name: "Writing Test 90", url: "https://practicepteonline.com/ielts-writing-test-90/" },
        { id: "w11-3", name: "Writing Test 91", url: "https://practicepteonline.com/ielts-writing-test-91/" },
        { id: "w11-4", name: "Writing Test 92", url: "https://practicepteonline.com/ielts-writing-test-92/" }
      ]
    }
  },
  {
    book: 10, year: 2015, label: "Cambridge 10",
    tests: {
      reading: [
        { id: "r10-1", name: "Reading Test 1", url: "https://practicepteonline.com/ielts-reading-test-36/" },
        { id: "r10-2", name: "Reading Test 2", url: "https://practicepteonline.com/ielts-reading-test-37/" },
        { id: "r10-3", name: "Reading Test 3", url: "https://practicepteonline.com/ielts-reading-test-38/" },
        { id: "r10-4", name: "Reading Test 4", url: "https://practicepteonline.com/ielts-reading-test-39/" }
      ],
      listening: [
        { id: "l10-1", name: "Listening Test 1", url: "https://practicepteonline.com/ielts-listening-test-141/", audio: "141_we" },
        { id: "l10-2", name: "Listening Test 2", url: "https://practicepteonline.com/ielts-listening-test-142/", audio: "142_we" },
        { id: "l10-3", name: "Listening Test 3", url: "https://practicepteonline.com/ielts-listening-test-143/", audio: "143_we" },
        { id: "l10-4", name: "Listening Test 4", url: "https://practicepteonline.com/ielts-listening-test-144/", audio: "144_we" }
      ],
      writing: [
        { id: "w10-1", name: "Writing Test 85", url: "https://practicepteonline.com/ielts-writing-test-85/" },
        { id: "w10-2", name: "Writing Test 86", url: "https://practicepteonline.com/ielts-writing-test-86/" },
        { id: "w10-3", name: "Writing Test 87", url: "https://practicepteonline.com/ielts-writing-test-87/" },
        { id: "w10-4", name: "Writing Test 88", url: "https://practicepteonline.com/ielts-writing-test-88/" }
      ]
    }
  },
  {
    book: 9, year: 2014, label: "Cambridge 9",
    tests: {
      reading: [
        { id: "r9-1", name: "Reading Test 1", url: "https://practicepteonline.com/ielts-reading-test-3/" },
        { id: "r9-2", name: "Reading Test 2", url: "https://practicepteonline.com/ielts-reading-test-2/" },
        { id: "r9-3", name: "Reading Test 3", url: "https://practicepteonline.com/ielts-reading-test-1/" },
        { id: "r9-4", name: "Reading Test 4", url: "https://practicepteonline.com/ielts-reading-test-35/" }
      ],
      listening: [
        { id: "l9-1", name: "Listening Test 1", url: "https://practicepteonline.com/ielts-listening-test-145/", audio: "145_we" },
        { id: "l9-2", name: "Listening Test 2", url: "https://practicepteonline.com/ielts-listening-test-146/", audio: "146_we" },
        { id: "l9-3", name: "Listening Test 3", url: "https://practicepteonline.com/ielts-listening-test-147/", audio: "147_we" },
        { id: "l9-4", name: "Listening Test 4", url: "https://practicepteonline.com/ielts-listening-test-148/", audio: "148_we" }
      ],
      writing: [
        { id: "w9-1", name: "Writing Test 81", url: "https://practicepteonline.com/ielts-writing-test-81/" },
        { id: "w9-2", name: "Writing Test 82", url: "https://practicepteonline.com/ielts-writing-test-82/" },
        { id: "w9-3", name: "Writing Test 83", url: "https://practicepteonline.com/ielts-writing-test-83/" },
        { id: "w9-4", name: "Writing Test 84", url: "https://practicepteonline.com/ielts-writing-test-84/" }
      ]
    }
  },
  {
    book: 8, year: 2013, label: "Cambridge 8",
    tests: {
      reading: [
        { id: "r8-1", name: "Reading Test 1", url: "https://practicepteonline.com/ielts-reading-test-7/" },
        { id: "r8-2", name: "Reading Test 2", url: "https://practicepteonline.com/ielts-reading-test-6/" },
        { id: "r8-3", name: "Reading Test 3", url: "https://practicepteonline.com/ielts-reading-test-5/" },
        { id: "r8-4", name: "Reading Test 4", url: "https://practicepteonline.com/ielts-reading-test-4/" }
      ],
      listening: [
        { id: "l8-1", name: "Listening Test 1", url: "https://practicepteonline.com/ielts-listening-test-149/", audio: "149_we" },
        { id: "l8-2", name: "Listening Test 2", url: "https://practicepteonline.com/ielts-listening-test-150/", audio: "150_we" },
        { id: "l8-3", name: "Listening Test 3", url: "https://practicepteonline.com/ielts-listening-test-151/", audio: "151_we" },
        { id: "l8-4", name: "Listening Test 4", url: "https://practicepteonline.com/ielts-listening-test-152/", audio: "152_we" }
      ],
      writing: [
        { id: "w8-1", name: "Writing Test 77", url: "https://practicepteonline.com/ielts-writing-test-77/" },
        { id: "w8-2", name: "Writing Test 78", url: "https://practicepteonline.com/ielts-writing-test-78/" },
        { id: "w8-3", name: "Writing Test 79", url: "https://practicepteonline.com/ielts-writing-test-79/" },
        { id: "w8-4", name: "Writing Test 80", url: "https://practicepteonline.com/ielts-writing-test-80/" }
      ]
    }
  },
  {
    book: 7, year: 2012, label: "Cambridge 7",
    tests: {
      reading: [
        { id: "r7-1", name: "Reading Test 1", url: "https://practicepteonline.com/ielts-reading-test-23/" },
        { id: "r7-2", name: "Reading Test 2", url: "https://practicepteonline.com/ielts-reading-test-24/" },
        { id: "r7-3", name: "Reading Test 3", url: "https://practicepteonline.com/ielts-reading-test-9/" },
        { id: "r7-4", name: "Reading Test 4", url: "https://practicepteonline.com/ielts-reading-test-8/" }
      ],
      listening: [
        { id: "l7-1", name: "Listening Test 1", url: "https://practicepteonline.com/ielts-listening-test-153/", audio: "153_we" },
        { id: "l7-2", name: "Listening Test 2", url: "https://practicepteonline.com/ielts-listening-test-154/", audio: "154_we" },
        { id: "l7-3", name: "Listening Test 3", url: "https://practicepteonline.com/ielts-listening-test-155/", audio: "155_we" },
        { id: "l7-4", name: "Listening Test 4", url: "https://practicepteonline.com/ielts-listening-test-156/", audio: "156_we" }
      ],
      writing: [
        { id: "w7-1", name: "Writing Test 73", url: "https://practicepteonline.com/ielts-writing-test-73/" },
        { id: "w7-2", name: "Writing Test 74", url: "https://practicepteonline.com/ielts-writing-test-74/" },
        { id: "w7-3", name: "Writing Test 75", url: "https://practicepteonline.com/ielts-writing-test-75/" },
        { id: "w7-4", name: "Writing Test 76", url: "https://practicepteonline.com/ielts-writing-test-76/" }
      ]
    }
  },
  {
    book: 6, year: 2011, label: "Cambridge 6",
    tests: {
      reading: [
        { id: "r6-1", name: "Reading Test 1", url: "https://practicepteonline.com/ielts-reading-test-19/" },
        { id: "r6-2", name: "Reading Test 2", url: "https://practicepteonline.com/ielts-reading-test-20/" },
        { id: "r6-3", name: "Reading Test 3", url: "https://practicepteonline.com/ielts-reading-test-21/" },
        { id: "r6-4", name: "Reading Test 4", url: "https://practicepteonline.com/ielts-reading-test-22/" }
      ],
      listening: [
        { id: "l6-1", name: "Listening Test 1", url: "https://practicepteonline.com/ielts-listening-test-157/", audio: "157_we" },
        { id: "l6-2", name: "Listening Test 2", url: "https://practicepteonline.com/ielts-listening-test-158/", audio: "158_we" },
        { id: "l6-3", name: "Listening Test 3", url: "https://practicepteonline.com/ielts-listening-test-159/", audio: "159_we" },
        { id: "l6-4", name: "Listening Test 4", url: "https://practicepteonline.com/ielts-listening-test-160/", audio: "160_we" }
      ],
      writing: [
        { id: "w6-1", name: "Writing Test 69", url: "https://practicepteonline.com/ielts-writing-test-69/" },
        { id: "w6-2", name: "Writing Test 70", url: "https://practicepteonline.com/ielts-writing-test-70/" },
        { id: "w6-3", name: "Writing Test 71", url: "https://practicepteonline.com/ielts-writing-test-71/" },
        { id: "w6-4", name: "Writing Test 72", url: "https://practicepteonline.com/ielts-writing-test-72/" }
      ]
    }
  },
  {
    book: 5, year: 2010, label: "Cambridge 5",
    tests: {
      reading: [
        { id: "r5-1", name: "Reading Test 1", url: "https://practicepteonline.com/ielts-reading-test-15/" },
        { id: "r5-2", name: "Reading Test 2", url: "https://practicepteonline.com/ielts-reading-test-16/" },
        { id: "r5-3", name: "Reading Test 3", url: "https://practicepteonline.com/ielts-reading-test-17/" },
        { id: "r5-4", name: "Reading Test 4", url: "https://practicepteonline.com/ielts-reading-test-18/" }
      ],
      listening: [
        { id: "l5-1", name: "Listening Test 1", url: "https://practicepteonline.com/ielts-listening-test-161/", audio: "161_we" },
        { id: "l5-2", name: "Listening Test 2", url: "https://practicepteonline.com/ielts-listening-test-162/", audio: "162_we" },
        { id: "l5-3", name: "Listening Test 3", url: "https://practicepteonline.com/ielts-listening-test-163/", audio: "163_we" },
        { id: "l5-4", name: "Listening Test 4", url: "https://practicepteonline.com/ielts-listening-test-164/", audio: "164_we" }
      ],
      writing: [
        { id: "w5-1", name: "Writing Test 65", url: "https://practicepteonline.com/ielts-writing-test-65/" },
        { id: "w5-2", name: "Writing Test 66", url: "https://practicepteonline.com/ielts-writing-test-66/" },
        { id: "w5-3", name: "Writing Test 67", url: "https://practicepteonline.com/ielts-writing-test-67/" },
        { id: "w5-4", name: "Writing Test 68", url: "https://practicepteonline.com/ielts-writing-test-68/" }
      ]
    }
  },
  {
    book: 4, year: 2009, label: "Cambridge 4",
    tests: {
      reading: [
        { id: "r4-1", name: "Reading Test 1", url: "https://practicepteonline.com/ielts-reading-test-55/" },
        { id: "r4-2", name: "Reading Test 2", url: "https://practicepteonline.com/ielts-reading-test-12/" },
        { id: "r4-3", name: "Reading Test 3", url: "https://practicepteonline.com/ielts-reading-test-13/" },
        { id: "r4-4", name: "Reading Test 4", url: "https://practicepteonline.com/ielts-reading-test-14/" }
      ],
      listening: [
        { id: "l4-1", name: "Listening Test 1", url: "https://practicepteonline.com/ielts-listening-test-165/", audio: "165_we" },
        { id: "l4-2", name: "Listening Test 2", url: "https://practicepteonline.com/ielts-listening-test-166/", audio: "166_we" },
        { id: "l4-3", name: "Listening Test 3", url: "https://practicepteonline.com/ielts-listening-test-167/", audio: "167_we" },
        { id: "l4-4", name: "Listening Test 4", url: "https://practicepteonline.com/ielts-listening-test-168/", audio: "168_we" }
      ],
      writing: [
        { id: "w4-1", name: "Writing Test 61", url: "https://practicepteonline.com/ielts-writing-test-61/" },
        { id: "w4-2", name: "Writing Test 62", url: "https://practicepteonline.com/ielts-writing-test-62/" },
        { id: "w4-3", name: "Writing Test 63", url: "https://practicepteonline.com/ielts-writing-test-63/" },
        { id: "w4-4", name: "Writing Test 64", url: "https://practicepteonline.com/ielts-writing-test-64/" }
      ]
    }
  },
  {
    book: 3, year: 2008, label: "Cambridge 3",
    tests: {
      reading: [
        { id: "r3-1", name: "Reading Test 1", url: "https://practicepteonline.com/ielts-reading-test-59/" },
        { id: "r3-2", name: "Reading Test 2", url: "https://practicepteonline.com/ielts-reading-test-27/" },
        { id: "r3-3", name: "Reading Test 3", url: "https://practicepteonline.com/ielts-reading-test-26/" },
        { id: "r3-4", name: "Reading Test 4", url: "https://practicepteonline.com/ielts-reading-test-25/" }
      ],
      listening: [
        { id: "l3-1", name: "Listening Test 1", url: "https://practicepteonline.com/ielts-listening-test-59/", audio: "59_we" }
      ],
      writing: [
        { id: "w3-1", name: "Writing Test 57", url: "https://practicepteonline.com/ielts-writing-test-57/" },
        { id: "w3-2", name: "Writing Test 58", url: "https://practicepteonline.com/ielts-writing-test-58/" },
        { id: "w3-3", name: "Writing Test 59", url: "https://practicepteonline.com/ielts-writing-test-59/" },
        { id: "w3-4", name: "Writing Test 60", url: "https://practicepteonline.com/ielts-writing-test-60/" }
      ]
    }
  },
  {
    book: 2, year: 2007, label: "Cambridge 2",
    tests: {
      reading: [
        { id: "r2-1", name: "Reading Test 1", url: "https://practicepteonline.com/ielts-reading-test-33/" },
        { id: "r2-2", name: "Reading Test 2", url: "https://practicepteonline.com/ielts-reading-test-34/" },
        { id: "r2-3", name: "Reading Test 3", url: "https://practicepteonline.com/ielts-reading-test-29/" },
        { id: "r2-4", name: "Reading Test 4", url: "https://practicepteonline.com/ielts-reading-test-28/" }
      ],
      listening: [
        { id: "l2-1", name: "Listening Test 1", url: "https://practicepteonline.com/ielts-listening-test-33/", audio: "33_we" },
        { id: "l2-2", name: "Listening Test 2", url: "https://practicepteonline.com/ielts-listening-test-34/", audio: "34_we" },
        { id: "l2-3", name: "Listening Test 3", url: "https://practicepteonline.com/ielts-listening-test-169/", audio: "169_we" },
        { id: "l2-4", name: "Listening Test 4", url: "https://practicepteonline.com/ielts-listening-test-170/", audio: "170_we" }
      ],
      writing: [
        { id: "w2-1", name: "Writing Test 53", url: "https://practicepteonline.com/ielts-writing-test-53/" },
        { id: "w2-2", name: "Writing Test 54", url: "https://practicepteonline.com/ielts-writing-test-54/" },
        { id: "w2-3", name: "Writing Test 55", url: "https://practicepteonline.com/ielts-writing-test-55/" },
        { id: "w2-4", name: "Writing Test 56", url: "https://practicepteonline.com/ielts-writing-test-56/" }
      ]
    }
  },
  {
    book: 1, year: 2006, label: "Cambridge 1",
    tests: {
      reading: [
        { id: "r1-1", name: "Reading Test 1", url: "https://practicepteonline.com/ielts-reading-test-62/" },
        { id: "r1-2", name: "Reading Test 2", url: "https://practicepteonline.com/ielts-reading-test-32/" },
        { id: "r1-3", name: "Reading Test 3", url: "https://practicepteonline.com/ielts-reading-test-30/" },
        { id: "r1-4", name: "Reading Test 4", url: "https://practicepteonline.com/ielts-reading-test-31/" }
      ],
      listening: [
        { id: "l1-1", name: "Listening Test 1", url: "https://practicepteonline.com/ielts-listening-test-171/", audio: "171_we" },
        { id: "l1-2", name: "Listening Test 2", url: "https://practicepteonline.com/ielts-listening-test-172/", audio: "172_we" },
        { id: "l1-3", name: "Listening Test 3", url: "https://practicepteonline.com/ielts-listening-test-174/", audio: "174_we" },
        { id: "l1-4", name: "Listening Test 4", url: "https://practicepteonline.com/ielts-listening-test-173/", audio: "173_we" }
      ],
      writing: [
        { id: "w1-1", name: "Writing Test 49", url: "https://practicepteonline.com/ielts-writing-test-49/" },
        { id: "w1-2", name: "Writing Test 50", url: "https://practicepteonline.com/ielts-writing-test-50/" },
        { id: "w1-3", name: "Writing Test 51", url: "https://practicepteonline.com/ielts-writing-test-51/" },
        { id: "w1-4", name: "Writing Test 52", url: "https://practicepteonline.com/ielts-writing-test-52/" }
      ]
    }
  }
];
