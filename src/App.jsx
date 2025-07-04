import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  LabelList,
  PieChart,
  Pie,
  Cell,
} from "recharts";
// Removed direct imports for jspdf and jspdf-autotable as they will be loaded via CDN.

// Reusable MultiSelectDropdown Component
// Added 'allOptionText' prop to explicitly define the text for the "All" selection.
const MultiSelectDropdown = ({
  options,
  selectedValues,
  onSelectionChange,
  placeholder,
  label,
  allOptionText,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const filteredOptions = useMemo(() => {
    if (!searchTerm) {
      return options;
    }
    return options.filter((option) =>
      option.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [options, searchTerm]);

  const handleCheckboxChange = (value, isChecked) => {
    // Use the explicitly passed 'allOptionText' as the value for the "All" option
    const allOptionValue = allOptionText;

    if (value === allOptionValue) {
      if (isChecked) {
        onSelectionChange([allOptionValue]); // Select only "All"
      } else {
        onSelectionChange([]); // Deselect "All", effectively nothing selected
      }
    } else {
      let newSelectedValues;
      if (isChecked) {
        // If "All" was selected, deselect it when another option is chosen
        newSelectedValues = [
          ...selectedValues.filter((val) => val !== allOptionValue),
          value,
        ];
      } else {
        newSelectedValues = selectedValues.filter((val) => val !== value);
      }

      // If no options are left selected (and "All" is not present), default back to "All"
      if (
        newSelectedValues.length === 0 &&
        !newSelectedValues.includes(allOptionValue)
      ) {
        onSelectionChange([allOptionValue]);
      } else {
        onSelectionChange(newSelectedValues);
      }
    }
  };

  // Modified: Display 'allOptionText' if it's the only selected value, otherwise show count.
  const displaySelected =
    selectedValues.length === 1 && selectedValues.includes(allOptionText)
      ? allOptionText
      : selectedValues.length > 0
      ? `${selectedValues.length} selected`
      : placeholder;

  return (
    <div className="relative testing" ref={dropdownRef}>
      <button
        type="button"
        className="flex justify-between items-center w-full p-2 rounded-md bg-gray-700 text-gray-200 border border-gray-600 focus:outline-none focus:border-blue-500"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span>{displaySelected}</span>
        <svg
          className={`w-4 h-4 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M19 9l-7 7-7-7"
          ></path>
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-10 w-full mt-2 bg-gray-700 border border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
          <input
            type="text"
            placeholder={`Search ${label.toLowerCase()}...`}
            className="w-full p-2 border-b border-gray-600 bg-gray-800 text-gray-200 focus:outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="p-2">
            <label className="flex items-center text-gray-200 text-sm py-1 cursor-pointer hover:bg-gray-600 rounded-md px-2">
              <input
                type="checkbox"
                value={allOptionText} // Use allOptionText as the value
                checked={selectedValues.includes(allOptionText)}
                onChange={(e) =>
                  handleCheckboxChange(e.target.value, e.target.checked)
                }
                className="form-checkbox h-4 w-4 text-blue-500 bg-gray-800 border-gray-500 rounded focus:ring-blue-500"
              />
              <span className="ml-2">{allOptionText}</span>{" "}
              {/* Display allOptionText */}
            </label>
            {filteredOptions.map((option) => (
              <label
                key={option}
                className="flex items-center text-gray-200 text-sm py-1 cursor-pointer hover:bg-gray-600 rounded-md px-2"
              >
                <input
                  type="checkbox"
                  value={option}
                  checked={selectedValues.includes(option)}
                  onChange={(e) =>
                    handleCheckboxChange(e.target.value, e.target.checked)
                  }
                  className="form-checkbox h-4 w-4 text-blue-500 bg-gray-800 border-gray-500 rounded focus:ring-blue-500"
                  disabled={selectedValues.includes(allOptionText)} // Disable individual options if 'All' is selected
                />
                <span className="ml-2">{option}</span>
              </label>
            ))}
            {filteredOptions.length === 0 && (
              <p className="text-gray-400 text-center py-2">
                No matching options.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Main App component
const App = () => {
  const [csvData, setCsvData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [message, setMessage] = useState("");
  const [uploadedFileContent, setUploadedFileContent] = useState(null);
  const fileInputRef = useRef(null);
  // State to track if PDF libraries are loaded
  const [pdfLibrariesLoaded, setPdfLibrariesLoaded] = useState(false);
  // Ref for the dashboard content to capture for PDF
  const dashboardRef = useRef(null);

  // New state to control rendering for PDF generation
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);

  // Aggregated data states
  const [totalWebinars, setTotalWebinars] = useState(0);
  const [totalRegistrations, setTotalRegistrations] = useState(0);
  const [totalAttendees, setTotalAttendees] = useState(0);
  const [attendeesRate, setAttendeesRate] = useState(0); // Changed from conversionRate to attendeesRate
  const [avgAttendanceTime, setAvgAttendanceTime] = useState(0);
  const [medianAttendanceTime, setMedianAttendanceTime] = useState(0);
  const [webinarsByLanguage, setWebinarsByLanguage] = useState([]);
  const [webinarsByCountry, setWebinarsByCountry] = useState([]);
  const [webinarsByTopic, setWebinarsByTopic] = useState([]);
  const [attendanceByTopic, setAttendanceByTopic] = useState([]);
  const [avgAttendanceTimeByTopic, setAvgAttendanceTimeByTopic] = useState([]);
  const [overallAvgSessionLength, setOverallAvgSessionLength] = useState(0);
  const [webinarsByRegion, setWebinarsByRegion] = useState([]);
  const [webinarsByCountryRegion, setWebinarsByCountryRegion] = useState([]); // State for webinars by country/region

  // New state for regional performance analysis, initialized with empty arrays
  const [regionalAnalysis, setRegionalAnalysis] = useState({
    Africa: {
      averageAttendance: 0,
      topPerformingSubRegion: "N/A",
      popularTopics: [],
      languages: [],
      breakdown: [],
    },
    Latam: {
      averageAttendance: 0,
      topPerformingSubRegion: "N/A",
      popularTopics: [],
      languages: [],
      breakdown: [],
    },
    Asia: {
      averageAttendance: 0,
      topPerformingSubRegion: "N/A",
      popularTopics: [],
      languages: [],
      breakdown: [],
    },
  });

  // New states for Optimal Timing & Frequency and Top Performing Topics cards
  const [optimalTimingFrequency, setOptimalTimingFrequency] = useState({
    bestDays: [],
    bestTimeSlots: [],
    averageDuration: 0,
    timeDistribution: [],
  });
  const [topPerformingTopics, setTopPerformingTopics] = useState({
    highestAttendance: [],
    bestEngagement: [],
    popularLanguages: [],
  });

  // New state for LLM insights
  const [topicInsights, setTopicInsights] = useState("");
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  // Default values for AI insights (no longer customizable from UI)
  // Updated prompt to be more general for "Webinar Insights"
  const defaultInsightPromptText =
    "Given the following webinar performance metrics and aggregated data, provide a brief analysis of overall performance, identify key strengths and weaknesses, and suggest actionable recommendations for improvement, including future webinar topics. Focus on key takeaways and a concise, actionable report.";
  const defaultNumSuggestions = 3; // Still used internally for LLM suggestions, even if not exposed in UI

  // New state for Language Distribution
  const [languageDistribution, setLanguageDistribution] = useState({
    Africa: [],
    Latam: [],
    Asia: [],
  });

  // New states for Trend Analysis
  const [selectedTrendFilter, setSelectedTrendFilter] = useState("month"); // Default filter
  const [trendData, setTrendData] = useState([]); // Data for the trend analysis chart

  // New states for general filters - now arrays for multi-selection
  const [selectedLocations, setSelectedLocations] = useState(["All Locations"]);
  const [selectedLanguages, setSelectedLanguages] = useState(["All Languages"]);
  // Modified: Changed initial state for topics to match 'All Webinars' text
  const [selectedTopics, setSelectedTopics] = useState(["All Webinars"]);
  // New state for Date filter
  const [selectedStartDate, setSelectedStartDate] = useState("");
  const [selectedEndDate, setSelectedEndDate] = useState("");

  const [availableLocations, setAvailableLocations] = useState([]);
  const [availableLanguages, setAvailableLanguages] = useState([]);
  const [availableTopics, setAvailableTopics] = useState([]);

  // New state for topic recommendations
  const [topicRecommendations, setTopicRecommendations] = useState({
    strong: [],
    average: [],
    poor: [],
  });

  // State for selected topic recommendation tab
  const [selectedRecommendationTab, setSelectedRecommendationTab] =
    useState("strong");

  // New states for optimal timing by country
  const [optimalTimingByCountry, setOptimalTimingByCountry] = useState([]);
  const [optimalRegistrationTiming, setOptimalRegistrationTiming] = useState(
    []
  );
  const [optimalAttendanceTiming, setOptimalAttendanceTiming] = useState([]);
  const [selectedTimingTab, setSelectedTimingTab] = useState("webinars");

  // State for dynamic Y-axis domain for No. of Emails chart
  const [emailsYAxisDomain, setEmailsYAxisDomain] = useState([0, 60000]);
  const [emailsYAxisTicks, setEmailsYAxisTicks] = useState([
    10000, 20000, 30000, 40000, 50000, 60000,
  ]);

  // States for dynamic Y-axis for 'Webinar Topics (Top 21)' (webinar count)
  const [webinarTopicsCountYAxisDomain, setWebinarTopicsCountYAxisDomain] =
    useState([0, 150]);
  const [webinarTopicsCountYAxisTicks, setWebinarTopicsCountYAxisTicks] =
    useState([0, 30, 60, 90, 120, 150]);

  // States for dynamic Y-axis for 'Topics Attendance Overview' (total attendees)
  const [topicsAttendanceYAxisDomain, setTopicsAttendanceYAxisDomain] =
    useState([0, 1500]);
  const [topicsAttendanceYAxisTicks, setTopicsAttendanceYAxisTicks] = useState([
    100, 300, 600, 900, 1200, 1500,
  ]);

  // State to hold the currently filtered data for PDF download (not directly used for image PDF)
  // const [currentFilteredData, setCurrentFilteredData] = useState([]);

  // Helper function to map country to region based on user's specific rules
  const getRegion = (country) => {
    if (!country) return "Unknown";
    const lowerCaseCountry = country.toLowerCase().trim();

    if (lowerCaseCountry === "latam") {
      return "Latam";
    }
    if (lowerCaseCountry.startsWith("africa")) {
      return "Africa";
    }
    return "Asia";
  };

  // Helper function to map country to a specific sub-region group for Regional Performance Analysis breakdown
  const getRegionalBreakdownGroup = (country, region) => {
    const lowerCaseCountry = country.toLowerCase().trim();

    if (region === "Africa") {
      const anglophoneAfricanKeywords = [
        "anglophone",
        "ghana",
        "nigeria",
        "south africa",
        "kenya",
      ];
      const francophoneAfricanKeywords = [
        "francophone",
        "senegal",
        "cote d'ivoire",
        "cameroon",
      ];
      const palopAfricanKeywords = [
        "palop",
        "angola",
        "mozambique",
        "cape verde",
        "guinea-bissau",
        "sao tome and principe",
        "east timor",
      ];

      if (
        anglophoneAfricanKeywords.some((keyword) =>
          lowerCaseCountry.includes(keyword)
        )
      )
        return "Anglophone";
      if (
        francophoneAfricanKeywords.some((keyword) =>
          lowerCaseCountry.includes(keyword)
        )
      )
        return "Francophone";
      if (
        palopAfricanKeywords.some((keyword) =>
          lowerCaseCountry.includes(keyword)
        )
      )
        return "PALOP";

      // If it's an African country but doesn't fit specific breakdown groups, categorize as "Other Africa"
      if (lowerCaseCountry.startsWith("africa:")) {
        // Catches "Africa: [Country Name]"
        const specificCountry = lowerCaseCountry.substring(7).trim();
        if (
          specificCountry &&
          !anglophoneAfricanKeywords.some((keyword) =>
            specificCountry.includes(keyword)
          ) &&
          !francophoneAfricanKeywords.some((keyword) =>
            specificCountry.includes(keyword)
          ) &&
          !palopAfricanKeywords.some((keyword) =>
            specificCountry.includes(keyword)
          )
        ) {
          return "Other Africa"; // Or the specific country name if you want more granularity
        }
      }
      // If it's Africa but doesn't fit predefined groups, it might be an implicit "Other Africa" or a general "Africa" entry
      if (lowerCaseCountry === "africa") return "Africa"; // If "Africa" is just a generic entry in Countries column
    } else if (region === "Latam") {
      const latamKeywords = [
        "latam",
        "spanish speaking",
        "brazil",
        "mexico",
        "argentina",
        "colombia",
        "chile",
        "peru",
        "ecuador",
        "venezuela",
      ];
      if (latamKeywords.some((keyword) => lowerCaseCountry.includes(keyword)))
        return "LATAM";
    } else if (region === "Asia") {
      const specificAsianKeywords = ["india", "pakistan", "sri lanka"];
      if (
        specificAsianKeywords.some((keyword) =>
          lowerCaseCountry.includes(keyword)
        )
      ) {
        // Capitalize for display, e.g., "sri lanka" -> "Sri Lanka"
        return lowerCaseCountry
          .split(" ")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");
      }
      const otherAsianKeywords = [
        "china",
        "japan",
        "korea",
        "thailand",
        "vietnam",
        "indonesia",
        "malaysia",
        "philippines",
      ];
      if (
        otherAsianKeywords.some((keyword) => lowerCaseCountry.includes(keyword))
      ) {
        return "Others";
      }
    }
    return null; // Return null if not part of a defined breakdown for the region
  };

  // Helper function to map country to specific groups for the new chart (Webinars by Country/Region Bar Chart)
  const getCountryGroup = (country) => {
    if (!country) return "Unknown Country";
    const lowerCaseCountry = country.toLowerCase().trim();

    // Direct matches
    if (lowerCaseCountry === "latam") return "Latam";
    if (lowerCaseCountry === "sri lanka") return "Sri Lanka";
    if (lowerCaseCountry === "india") return "India";
    if (lowerCaseCountry === "pakistan") return "Pakistan";
    if (lowerCaseCountry === "anglophone") return "Anglophone";
    if (lowerCaseCountry === "francophone") return "Francophone";
    if (lowerCaseCountry === "palop") return "PALOP";

    // Prefix matches for regions (e.g., 'Africa: Nigeria' -> 'Africa')
    if (lowerCaseCountry.startsWith("africa:")) return "Africa";

    // Grouping by common countries
    const anglophoneCountries = [
      "united states",
      "canada",
      "united kingdom",
      "australia",
      "new zealand",
      "ireland",
      "singapore",
      "ghana",
      "nigeria",
      "south africa",
      "kenya",
    ];
    const francophoneCountries = [
      "france",
      "belgium",
      "switzerland",
      "canada (french)",
      "senegal",
      "cote d'ivoire",
      "cameroon",
    ];
    const palopCountries = [
      "angola",
      "mozambique",
      "cape verde",
      "guinea-bissau",
      "sao tome and Principe",
      "east timor",
    ];
    const latamCountries = [
      "brazil",
      "mexico",
      "argentina",
      "colombia",
      "chile",
      "peru",
      "ecuador",
      "venezuela",
    ];
    const asiaCountries = [
      "china",
      "japan",
      "korea",
      "thailand",
      "vietnam",
      "indonesia",
      "malaysia",
      "philippines",
    ];

    if (anglophoneCountries.includes(lowerCaseCountry)) return "Anglophone";
    if (francophoneCountries.includes(lowerCaseCountry)) return "Francophone";
    if (palopCountries.includes(lowerCaseCountry)) return "PALOP";
    if (latamCountries.includes(lowerCaseCountry)) return "Latam";
    if (asiaCountries.includes(lowerCaseCountry)) return "Asia";

    // If no specific group is matched, return the country name itself
    return country.trim();
  };

  // Function to handle file upload - now only stores the file content
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      console.log("File selected:", file.name);
      setMessage('File selected. Click "Generate Report" to view dashboard.');
      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadedFileContent(e.target.result);
      };
      reader.readAsText(file);
    } else {
      setMessage("No file selected.");
      setUploadedFileContent(null);
      setCsvData([]);
      setHeaders([]);
      resetAggregatedData();
    }
  };

  // Function to handle report generation
  const handleGenerateReport = () => {
    if (uploadedFileContent) {
      setMessage("Generating report...");
      try {
        parseCsv(uploadedFileContent);
        setMessage("Report generated successfully!");
      } catch (error) {
        console.error("Error parsing CSV for report:", error);
        setMessage("Error generating report. Please check the CSV format.");
        setCsvData([]);
        setHeaders([]);
        resetAggregatedData();
      }
    } else {
      setMessage("Please upload a CSV file first.");
    }
  };

  // Function to reset all aggregated data states
  const resetAggregatedData = () => {
    setTotalWebinars(0);
    setTotalRegistrations(0);
    setTotalAttendees(0);
    setAttendeesRate(0); // Reset attendeesRate
    setAvgAttendanceTime(0);
    setMedianAttendanceTime(0);
    setWebinarsByLanguage([]);
    setWebinarsByCountry([]);
    setWebinarsByTopic([]); // Reset
    setAttendanceByTopic([]); // Reset
    setAvgAttendanceTimeByTopic([]);
    setOverallAvgSessionLength(0);
    setWebinarsByRegion([]);
    setWebinarsByCountryRegion([]); // Reset country/region data
    // Reset regional analysis to its structured initial state
    setRegionalAnalysis({
      Africa: {
        averageAttendance: 0,
        topPerformingSubRegion: "N/A",
        popularTopics: [],
        languages: [],
        breakdown: [],
      },
      Latam: {
        totalAttendees: 0,
        totalWebinars: 0,
        topics: {},
        languages: new Set(),
        breakdown: {},
        languageCounts: {},
      },
      Asia: {
        totalAttendees: 0,
        totalWebinars: 0,
        topics: {},
        languages: new Set(),
        breakdown: {},
        languageCounts: {},
      },
    });
    setOptimalTimingFrequency({
      // Reset new card states
      bestDays: [],
      bestTimeSlots: [],
      averageDuration: 0,
      timeDistribution: [], // Reset as empty array
    });
    setTopPerformingTopics({
      // Reset new card states
      highestAttendance: [],
      bestEngagement: [],
      popularLanguages: [],
    });
    setTopicInsights(""); // Reset topic insights
    setIsLoadingInsights(false); // Reset loading state
    setLanguageDistribution({
      // Reset language distribution
      Africa: [],
      Latam: [],
      Asia: [],
    });
    setTrendData([]); // Reset trend data
    setSelectedLocations(["All Locations"]); // Reset to initial array state
    setSelectedLanguages(["All Languages"]); // Reset to initial array state
    setSelectedTopics(["All Webinars"]); // Reset to initial array state
    setSelectedStartDate(""); // Reset date filter
    setSelectedEndDate(""); // Reset date filter
    setAvailableLocations([]);
    setAvailableLanguages([]);
    setAvailableTopics([]);
    setTopicRecommendations({ strong: [], average: [], poor: [] }); // Reset topic recommendations
    setSelectedRecommendationTab("strong"); // Reset selected tab
    setOptimalTimingByCountry([]); // Reset new state
    setOptimalRegistrationTiming([]); // Reset new state
    setOptimalAttendanceTiming([]); // Reset new state
    setSelectedTimingTab("webinars"); // Reset active timing tab
    setEmailsYAxisDomain([0, 60000]); // Reset Y-axis domain
    setEmailsYAxisTicks([10000, 20000, 30000, 40000, 50000, 60000]); // Reset Y-axis ticks
    setWebinarTopicsCountYAxisDomain([0, 150]); // Reset
    setWebinarTopicsCountYAxisTicks([0, 30, 60, 90, 120, 150]); // Reset
    setTopicsAttendanceYAxisDomain([0, 1500]); // Reset
    setTopicsAttendanceYAxisTicks([100, 300, 600, 900, 1200, 1500]); // Reset
    // setCurrentFilteredData([]); // Not needed for image PDF
  };

  // Function to parse CSV text with robust handling for quoted fields
  const parseCsv = (text) => {
    // Corrected the filter function syntax
    const lines = text.split("\n").filter((line) => line.trim() !== "");
    if (lines.length === 0) {
      setMessage("CSV file is empty.");
      setCsvData([]);
      setHeaders([]);
      resetAggregatedData();
      return;
    }

    // A more robust CSV parsing function that handles commas within double quotes
    const parseLineRobust = (line) => {
      const values = [];
      let inQuote = false;
      let currentField = "";
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuote = !inQuote;
        } else if (char === "," && !inQuote) {
          values.push(currentField.trim());
          currentField = "";
        } else {
          currentField += char;
        }
      }
      values.push(currentField.trim()); // Add the last field

      // Clean up quotes from fields that might have been quoted
      return values.map((field) => {
        if (field.startsWith('"') && field.endsWith('"')) {
          return field.substring(1, field.length - 1).trim();
        }
        return field;
      });
    };

    const parsedHeaders = parseLineRobust(lines[0]);
    setHeaders(parsedHeaders);
    console.log("Parsed headers:", parsedHeaders);

    const data = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseLineRobust(lines[i]);

      if (values.length === parsedHeaders.length) {
        const row = {};
        parsedHeaders.forEach((header, index) => {
          let value = values[index];

          if (header === "Date") {
            const cleanedDate = value
              .replace(/,$/, "")
              .replace(/(\d+)(st|nd|rd|th)/g, "$1");
            try {
              // Store original cleaned date string
              value = isNaN(new Date(cleanedDate).getTime())
                ? value
                : cleanedDate;
            } catch (e) {
              console.warn(`Could not parse date "${value}":`, e);
            }
          } else if (!isNaN(Number(value)) && value !== "") {
            value = Number(value);
          } else if (value === "") {
            if (
              [
                "No. of emails",
                "No. of registrations",
                "No. of attendees",
                "Total Duration",
                "Average attendance time",
                "Median attendance",
              ].includes(header)
            ) {
              value = 0;
            }
          }
          row[header] = value;
        });
        data.push(row);
      } else {
        console.warn(
          `Skipping malformed row ${i + 1}: ${lines[i]} - Expected ${
            parsedHeaders.length
          } columns, got ${values.length}`
        );
      }
    }
    setCsvData(data);
    console.log("Parsed data (first 5 rows):", data.slice(0, 5));
    console.log("Total parsed rows:", data.length);

    // Extract unique values for filters
    const uniqueLocations = [
      ...new Set(data.map((row) => row["Countries"]).filter(Boolean)),
    ].sort();
    const uniqueLanguages = [
      ...new Set(data.map((row) => row["Languages"]).filter(Boolean)),
    ].sort();
    const uniqueTopics = [
      ...new Set(data.map((row) => row["Webinar Topics"]).filter(Boolean)),
    ].sort();

    setAvailableLocations(uniqueLocations);
    setAvailableLanguages(uniqueLanguages);
    setAvailableTopics(uniqueTopics);

    // Calculate aggregated data with initial filter states
    calculateFilteredData(
      data,
      selectedLocations,
      selectedLanguages,
      selectedTopics,
      selectedStartDate,
      selectedEndDate
    );
  };

  // Helper function to filter data based on selected filters
  const getFilteredData = (
    data,
    locations,
    languages,
    topics,
    startDate,
    endDate
  ) => {
    return data.filter((row) => {
      // If 'All Locations' is selected, or if the locations array is empty, consider all locations.
      // Otherwise, check if the row's country is in the selected locations array.
      const matchesLocation =
        locations.includes("All Locations") ||
        locations.length === 0 ||
        locations.includes(row["Countries"]);
      const matchesLanguage =
        languages.includes("All Languages") ||
        languages.length === 0 ||
        languages.includes(row["Languages"]);
      // Corrected: Check against 'All Webinars' for topics filter
      const matchesTopic =
        topics.includes("All Webinars") ||
        topics.length === 0 ||
        topics.includes(row["Webinar Topics"]);

      // Date filtering logic
      let matchesDate = true;
      if (startDate || endDate) {
        const rowDate = row["Date"] ? new Date(row["Date"]) : null; // Ensure row['Date'] is parsed as a Date object
        const filterStartDate = startDate ? new Date(startDate) : null;
        const filterEndDate = endDate ? new Date(endDate) : null;

        if (rowDate) {
          if (filterStartDate && rowDate < filterStartDate) {
            matchesDate = false;
          }
          // For end date, filter until the end of the day
          if (filterEndDate) {
            // Set filterEndDate to the end of the day (23:59:59.999) to include all webinars on that day
            const adjustedFilterEndDate = new Date(filterEndDate);
            adjustedFilterEndDate.setHours(23, 59, 59, 999);
            if (rowDate > adjustedFilterEndDate) {
              matchesDate = false;
            }
          }
        } else {
          // If rowDate is null, and a date filter is applied, it shouldn't match
          if (filterStartDate || filterEndDate) {
            matchesDate = false;
          }
        }
      }

      return matchesLocation && matchesLanguage && matchesTopic && matchesDate;
    });
  };

  // Helper function to find optimal timing based on a given counts map
  const findOptimalTiming = (countsMap, metricType) => {
    const finalOptimalTiming = [];
    for (const country in countsMap) {
      let bestDay = "N/A";
      let bestTimeString = "N/A";
      let maxMetricValue = 0;

      for (const dayOfWeek in countsMap[country]) {
        for (const timeString in countsMap[country][dayOfWeek]) {
          const metricValue = countsMap[country][dayOfWeek][timeString];
          if (metricValue > maxMetricValue) {
            maxMetricValue = metricValue;
            bestDay = dayOfWeek;
            bestTimeString = timeString;
          }
        }
      }

      finalOptimalTiming.push({
        country,
        bestDay: bestDay,
        bestTime: bestTimeString,
        metricValue: maxMetricValue,
        metricType: metricType,
      });
    }
    return finalOptimalTiming.sort((a, b) =>
      a.country.localeCompare(b.country)
    );
  };

  // Helper function to calculate dynamic Y-axis domain and ticks
  const calculateDynamicYAxis = (maxValue, minInterval = 10, numTicks = 5) => {
    if (maxValue === 0) {
      // If maxValue is 0, provide a reasonable default range.
      // For counts, this could be [0, 10] or [0, 100] depending on expected data scale.
      // For attendees, it might be [0, 100] or [0, 1000].
      // Using a small but visible range like [0, 5] for counts and [0, 50] for attendees
      // if all filtered values are zero, to make the chart visible.
      // Let's make it smarter based on context if possible, but a generic default for 0 is fine.
      return { domain: [0, 5], ticks: [0, 1, 2, 3, 4, 5] };
    }

    let calculatedMax = maxValue;
    // Round up to a 'nice' number
    const orderOfMagnitude = Math.pow(10, Math.floor(Math.log10(maxValue)));
    calculatedMax =
      Math.ceil(maxValue / (orderOfMagnitude / 2)) * (orderOfMagnitude / 2);
    if (calculatedMax < maxValue) {
      // Ensure max is always greater than or equal to actual max value
      calculatedMax = Math.ceil(maxValue / orderOfMagnitude) * orderOfMagnitude;
    }
    if (calculatedMax === 0 && maxValue > 0) calculatedMax = maxValue * 1.2; // Small buffer for very small values

    // Adjust for smaller numbers to ensure reasonable ticks
    if (calculatedMax < 10 && calculatedMax > 0) {
      calculatedMax = Math.ceil(maxValue / 1) * 1; // Round up to nearest integer
      if (calculatedMax === 0) calculatedMax = 10; // Ensure a min max value
    } else if (calculatedMax < 100 && calculatedMax > 0) {
      calculatedMax = Math.ceil(calculatedMax / 10) * 10;
    } else if (calculatedMax < 1000 && calculatedMax > 0) {
      calculatedMax = Math.ceil(calculatedMax / 100) * 100;
    } else {
      // For large numbers, round to nearest 1000 or 5000 etc.
      calculatedMax = Math.ceil(maxValue / 1000) * 1000;
    }

    // Ensure there's a minimum upper bound for visual clarity, e.g., 5 for counts, 50 for attendees.
    // This prevents the axis from being too compressed if max value is very small (e.g., 1 or 2).
    const minCalculatedMax =
      numTicks > 1 ? (numTicks - 1) * minInterval : minInterval;
    calculatedMax = Math.max(calculatedMax, minCalculatedMax);

    const tickStep = calculatedMax / (numTicks - 1);
    const newTicks = [];
    for (let i = 0; i < numTicks; i++) {
      // Round ticks for cleaner display, especially for non-integer steps
      newTicks.push(Math.round(tickStep * i));
    }
    // Ensure the last tick is precisely the calculated max
    if (newTicks[newTicks.length - 1] !== calculatedMax) {
      newTicks[newTicks.length - 1] = calculatedMax;
    }

    // Add 5% buffer to the domain to prevent data points from touching the top of the chart
    const bufferedMax = calculatedMax * 1.05;
    return { domain: [0, bufferedMax], ticks: newTicks };
  };

  // Centralized function to calculate all dashboard data based on current filters
  const calculateFilteredData = (
    data,
    locations,
    languages,
    topics,
    startDate,
    endDate
  ) => {
    const filteredData = getFilteredData(
      data,
      locations,
      languages,
      topics,
      startDate,
      endDate
    );
    // setCurrentFilteredData(filteredData); // Not needed for image PDF

    let totalReg = 0;
    let totalAtt = 0;
    let totalAvgAttTime = 0;
    let totalMedianAttTime = 0;
    let validAttendanceTimeCount = 0;
    let maxEmails = 0; // Initialize maxEmails for dynamic Y-axis

    const languageMap = {};
    const countryMap = {};
    const topicMap = {};
    const attendanceByTopicMap = {};
    const avgAttendanceTimeByTopicMap = {};
    const topicWebinarCountMap = {};
    const webinarsByRegionMap = {};
    const attendeesByRegionMap = {};
    const webinarsByCountryRegionMap = {};

    // Temporary map for regional analysis, will be converted to arrays for state
    const regionalAnalysisProcessingMap = {
      Africa: {
        totalAttendees: 0,
        totalWebinars: 0,
        topics: {},
        languages: new Set(),
        breakdown: {},
        languageCounts: {},
      },
      Latam: {
        totalAttendees: 0,
        totalWebinars: 0,
        topics: {},
        languages: new Set(),
        breakdown: {},
        languageCounts: {},
      },
      Asia: {
        totalAttendees: 0,
        totalWebinars: 0,
        topics: {},
        languages: new Set(),
        breakdown: {},
        languageCounts: {},
      },
    };

    // Initialize maps for overall optimal timing
    const bestDaysMap = {}; // For overall "Best Days"
    const mytHourFrequencies = {}; // For overall "Best Time Slots" (aggregated by hour)
    const timeOfDayCounts = { Morning: 0, Afternoon: 0, Evening: 0, Night: 0 }; // For overall "Time Distribution"

    let totalDurationSum = 0;
    let durationCount = 0;
    const topicAttendancePerformance = {};

    // New maps for optimal timing by country, now storing precise time strings
    const countryDayTimeCounts = {};
    const countryDayRegistrationCounts = {};
    const countryDayAttendanceCounts = {};

    filteredData.forEach((row) => {
      totalReg += row["No. of registrations"] || 0;
      totalAtt += row["No. of attendees"] || 0;

      if (typeof row["Average attendance time"] === "number") {
        totalAvgAttTime += row["Average attendance time"];
        validAttendanceTimeCount++;
      }
      if (typeof row["Median attendance"] === "number") {
        totalMedianAttTime += row["Median attendance"];
      }
      // Calculate maxEmails for dynamic Y-axis
      if (
        headers.includes("No. of emails") &&
        typeof row["No. of emails"] === "number"
      ) {
        if (row["No. of emails"] > maxEmails) {
          maxEmails = row["No. of emails"];
        }
      }

      // Aggregate by Language
      if (row["Languages"]) {
        languageMap[row["Languages"]] =
          (languageMap[row["Languages"]] || 0) + 1;
      }
      // Aggregate by Country
      if (row["Countries"]) {
        countryMap[row["Countries"]] = (countryMap[row["Countries"]] || 0) + 1;
      }
      // Aggregate by Topic (for count)
      if (row["Webinar Topics"]) {
        topicMap[row["Webinar Topics"]] =
          (topicMap[row["Webinar Topics"]] || 0) + 1;
      }
      // Aggregate Attendance by Topic
      if (
        row["Webinar Topics"] &&
        typeof row["No. of attendees"] === "number"
      ) {
        attendanceByTopicMap[row["Webinar Topics"]] =
          (attendanceByTopicMap[row["Webinar Topics"]] || 0) +
          row["No. of attendees"];
      }

      // Aggregate Average Attendance Time by Topic
      if (
        row["Webinar Topics"] &&
        typeof row["Average attendance time"] === "number"
      ) {
        avgAttendanceTimeByTopicMap[row["Webinar Topics"]] =
          (avgAttendanceTimeByTopicMap[row["Webinar Topics"]] || 0) +
          row["Average attendance time"];
        topicWebinarCountMap[row["Webinar Topics"]] =
          (topicWebinarCountMap[row["Webinar Topics"]] || 0) + 1;
      }

      // Aggregate Webinars and Attendees by Region (previous logic)
      if (row["Countries"]) {
        const region = getRegion(row["Countries"]);
        if (!webinarsByRegionMap[region]) {
          webinarsByRegionMap[region] = {
            webinars: 0,
            attendees: 0,
            totalRetention: 0,
            countRetention: 0,
          };
        }
        webinarsByRegionMap[region].webinars += 1;
        webinarsByRegionMap[region].attendees += row["No. of attendees"] || 0;
        if (typeof row["Average attendance time"] === "number") {
          webinarsByRegionMap[region].totalRetention +=
            row["Average attendance time"];
          webinarsByRegionMap[region].countRetention += 1;
        }
      }

      // Aggregate Webinars, Attendees, and Retention by Country/Region Group (new logic for country/region chart)
      if (row["Countries"]) {
        const group = getCountryGroup(row["Countries"]);
        if (!webinarsByCountryRegionMap[group]) {
          webinarsByCountryRegionMap[group] = {
            webinars: 0,
            attendees: 0,
            totalRetention: 0,
            countRetention: 0,
          };
        }
        webinarsByCountryRegionMap[group].webinars += 1;
        webinarsByCountryRegionMap[group].attendees +=
          row["No. of attendees"] || 0;
        if (typeof row["Average attendance time"] === "number") {
          webinarsByCountryRegionMap[group].totalRetention +=
            row["Average attendance time"];
          webinarsByCountryRegionMap[group].countRetention += 1;
        }
      }

      // Populate regionalAnalysisProcessingMap for the new card
      const regionForAnalysis = getRegion(row["Countries"]);
      if (regionalAnalysisProcessingMap[regionForAnalysis]) {
        regionalAnalysisProcessingMap[regionForAnalysis].totalAttendees +=
          row["No. of attendees"] || 0;
        regionalAnalysisProcessingMap[regionForAnalysis].totalWebinars += 1;

        if (row["Webinar Topics"]) {
          regionalAnalysisProcessingMap[regionForAnalysis].topics[
            row["Webinar Topics"]
          ] =
            (regionalAnalysisProcessingMap[regionForAnalysis].topics[
              row["Webinar Topics"]
            ] || 0) + 1;
        }
        if (row["Languages"]) {
          regionalAnalysisProcessingMap[regionForAnalysis].languages.add(
            row["Languages"]
          );
          // For language distribution
          regionalAnalysisProcessingMap[regionForAnalysis].languageCounts[
            row["Languages"]
          ] =
            (regionalAnalysisProcessingMap[regionForAnalysis].languageCounts[
              row["Languages"]
            ] || 0) + 1;
        }

        const breakdownGroup = getRegionalBreakdownGroup(
          row["Countries"],
          regionForAnalysis
        );
        if (breakdownGroup) {
          regionalAnalysisProcessingMap[regionForAnalysis].breakdown[
            breakdownGroup
          ] =
            (regionalAnalysisProcessingMap[regionForAnalysis].breakdown[
              breakdownGroup
            ] || 0) + 1;
        }
      }

      // Aggregate for Optimal Timing & Frequency (Overall and country-specific timing)
      if (row["Date"] && row["Time (MYT)"]) {
        try {
          const datePart = String(row["Date"]).trim();
          const timePart = String(row["Time (MYT)"]).trim();
          const combinedDateTimeString = `${datePart} ${timePart}`;

          const timeMatch = timePart.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i);
          let mytHour = -1;
          let mytMinute = 0;

          if (timeMatch) {
            let hour = parseInt(timeMatch[1], 10);
            mytMinute = parseInt(timeMatch[2], 10);
            const ampm = timeMatch[3] ? timeMatch[3].toLowerCase() : "";

            if (ampm === "pm" && hour !== 12) {
              hour += 12;
            } else if (ampm === "am" && hour === 12) {
              hour = 0;
            }

            if (hour >= 0 && hour <= 23 && mytMinute >= 0 && mytMinute <= 59) {
              mytHour = hour;
            }
          }

          let preciseTimeString = "";
          if (mytHour !== -1) {
            const formattedHourVal = mytHour % 12 === 0 ? 12 : mytHour % 12;
            const ampm = mytHour >= 12 ? "PM" : "AM";
            preciseTimeString = `${formattedHourVal
              .toString()
              .padStart(2, "0")}:${mytMinute
              .toString()
              .padStart(2, "0")} ${ampm}`;
          }

          const dateObjForDay = new Date(combinedDateTimeString);

          if (
            !isNaN(dateObjForDay.getTime()) &&
            mytHour !== -1 &&
            mytHour >= 0 &&
            mytHour <= 23 &&
            mytMinute >= 0 &&
            mytMinute <= 59
          ) {
            const dayOfWeek = dateObjForDay.toLocaleString("en-US", {
              weekday: "long",
            });

            // For Overall Optimal Timing & Frequency
            bestDaysMap[dayOfWeek] = (bestDaysMap[dayOfWeek] || 0) + 1; // Populate for Best Days
            mytHourFrequencies[preciseTimeString] =
              (mytHourFrequencies[preciseTimeString] || 0) + 1; // Populate for Best Time Slots (using precise string)

            // Populate for Time Distribution (Morning, Afternoon, etc.)
            if (mytHour >= 5 && mytHour < 12) {
              timeOfDayCounts["Morning"]++;
            } else if (mytHour >= 12 && mytHour < 17) {
              timeOfDayCounts["Afternoon"]++;
            } else if (mytHour >= 17 && mytHour < 21) {
              timeOfDayCounts["Evening"]++;
            } else {
              timeOfDayCounts["Night"]++;
            }

            // For Country-specific Optimal Timing
            if (row["Countries"]) {
              const country = row["Countries"];
              if (!countryDayTimeCounts[country])
                countryDayTimeCounts[country] = {};
              if (!countryDayTimeCounts[country][dayOfWeek])
                countryDayTimeCounts[country][dayOfWeek] = {};
              countryDayTimeCounts[country][dayOfWeek][preciseTimeString] =
                (countryDayTimeCounts[country][dayOfWeek][preciseTimeString] ||
                  0) + 1;

              if (!countryDayRegistrationCounts[country])
                countryDayRegistrationCounts[country] = {};
              if (!countryDayRegistrationCounts[country][dayOfWeek])
                countryDayRegistrationCounts[country][dayOfWeek] = {};
              countryDayRegistrationCounts[country][dayOfWeek][
                preciseTimeString
              ] =
                (countryDayRegistrationCounts[country][dayOfWeek][
                  preciseTimeString
                ] || 0) + (row["No. of registrations"] || 0);

              if (!countryDayAttendanceCounts[country])
                countryDayAttendanceCounts[country] = {};
              if (!countryDayAttendanceCounts[country][dayOfWeek])
                countryDayAttendanceCounts[country][dayOfWeek] = {};
              countryDayAttendanceCounts[country][dayOfWeek][
                preciseTimeString
              ] =
                (countryDayAttendanceCounts[country][dayOfWeek][
                  preciseTimeString
                ] || 0) + (row["No. of attendees"] || 0);
            }
          } else {
            console.warn(
              `Skipping timing data for row due to invalid date/time or hour/minute conditions.`
            );
          }
        } catch (e) {
          console.error(
            "Error processing date for timing analysis:",
            row["Date"],
            row["Time (MYT)"],
            e
          );
        }
      } else {
        console.warn(
          `Skipping timing data for row due to missing 'Date' or 'Time (MYT)' column: Date="${row["Date"]}", Time (MYT)="${row["Time (MYT)"]}"`
        );
      }

      if (typeof row["Total Duration"] === "number") {
        totalDurationSum += row["Total Duration"];
        durationCount++;
      }

      // Aggregate for Top Performing Topics (Attendance Rate) and also for Topic Recommendations
      if (row["Webinar Topics"]) {
        const topic = row["Webinar Topics"];
        const registrations = row["No. of registrations"] || 0;
        const attendees = row["No. of attendees"] || 0;

        if (!topicAttendancePerformance[topic]) {
          topicAttendancePerformance[topic] = {
            totalRegistrations: 0,
            totalAttendees: 0,
            totalAvgTime: 0,
            webinarCount: 0,
          };
        }
        topicAttendancePerformance[topic].totalRegistrations += registrations;
        topicAttendancePerformance[topic].totalAttendees += attendees;
        if (typeof row["Average attendance time"] === "number") {
          topicAttendancePerformance[topic].totalAvgTime +=
            row["Average attendance time"];
          topicAttendancePerformance[topic].webinarCount += 1;
        }
      }
    });

    setTotalWebinars(filteredData.length);
    setTotalRegistrations(totalReg);
    setTotalAttendees(totalAtt);
    setAttendeesRate(
      totalReg > 0 ? ((totalAtt / totalReg) * 100).toFixed(2) : 0
    ); // Use attendeesRate
    // Updated to round to 0 decimal places
    setAvgAttendanceTime(
      validAttendanceTimeCount > 0
        ? Math.round(totalAvgAttTime / validAttendanceTimeCount)
        : 0
    );
    setMedianAttendanceTime(
      filteredData.length > 0
        ? Math.round(totalMedianAttTime / filteredData.length)
        : 0
    );

    // Dynamic Y-axis for Emails chart
    let dynamicMaxEmails = 0;
    if (headers.includes("No. of emails")) {
      const emailsData = filteredData.map((row) => row["No. of emails"] || 0);
      dynamicMaxEmails = Math.max(...emailsData);
    }
    const { domain: emailsDomain, ticks: emailsTicks } =
      calculateDynamicYAxis(dynamicMaxEmails);
    setEmailsYAxisDomain(emailsDomain);
    setEmailsYAxisTicks(emailsTicks);

    // Calculate tempWebinarsByLanguage directly from languageMap for immediate use
    const tempWebinarsByLanguage = Object.entries(languageMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    setWebinarsByLanguage(tempWebinarsByLanguage); // Update state for other components

    setWebinarsByCountry(
      Object.entries(countryMap)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
    );

    // Sort and slice for top 21 topics (by count)
    const sortedWebinarsByTopic = Object.entries(topicMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 21);
    setWebinarsByTopic(sortedWebinarsByTopic);
    // Calculate dynamic Y-axis for Webinar Topics (Top 21)
    const maxWebinarCount = Math.max(
      ...sortedWebinarsByTopic.map((item) => item.count),
      0
    );
    const { domain: webinarCountDomain, ticks: webinarCountTicks } =
      calculateDynamicYAxis(maxWebinarCount, 1, 5); // minInterval 1 for counts
    setWebinarTopicsCountYAxisDomain(webinarCountDomain);
    setWebinarTopicsCountYAxisTicks(webinarCountTicks);

    // Sort attendance by topic in descending order and set state, taking only top 21
    const sortedAttendanceByTopic = Object.entries(attendanceByTopicMap)
      .map(([name, attendees]) => ({ name, attendees }))
      .sort((a, b) => b.attendees - a.attendees)
      .slice(0, 21);
    setAttendanceByTopic(sortedAttendanceByTopic);
    // Calculate dynamic Y-axis for Topics Attendance Overview
    const maxAttendees = Math.max(
      ...sortedAttendanceByTopic.map((item) => item.attendees),
      0
    );
    const { domain: attendeesDomain, ticks: attendeesTicks } =
      calculateDynamicYAxis(maxAttendees, 10, 5); // minInterval 10 for attendees
    setTopicsAttendanceYAxisDomain(attendeesDomain);
    setTopicsAttendanceYAxisTicks(attendeesTicks);

    // Calculate and sort average attendance time by topic, taking only top 21
    const calculatedAvgAttendanceTimeByTopic = Object.entries(
      topicAttendancePerformance
    )
      .map(([name, metrics]) => ({
        name,
        avgTime:
          metrics.webinarCount > 0
            ? (metrics.totalAvgTime / metrics.webinarCount).toFixed(0)
            : 0,
      }))
      .sort((a, b) => b.avgTime - a.avgTime)
      .slice(0, 21);
    setAvgAttendanceTimeByTopic(calculatedAvgAttendanceTimeByTopic);

    // Calculate overall average session length
    const totalAvgTimeSum = calculatedAvgAttendanceTimeByTopic.reduce(
      (sum, topic) => sum + Number(topic.avgTime),
      0
    );
    const overallAvg =
      calculatedAvgAttendanceTimeByTopic.length > 0
        ? (totalAvgTimeSum / calculatedAvgAttendanceTimeByTopic.length).toFixed(
            0
          )
        : 0;
    setOverallAvgSessionLength(overallAvg);

    // Prepare data for Webinars by Region Pie Chart and Cards (previous logic)
    const totalWebinarsForRegions = Object.values(webinarsByRegionMap).reduce(
      (sum, groupData) => sum + groupData.webinars,
      0
    ); // Corrected sum
    const preparedWebinarsByRegion = Object.entries(webinarsByRegionMap).map(
      ([region, groupData]) => ({
        name: region,
        value: groupData.webinars,
        attendees: groupData.attendees,
        avgRetention:
          groupData.countRetention > 0
            ? (groupData.totalRetention / groupData.countRetention).toFixed(0)
            : 0,
        percentage:
          totalWebinarsForRegions > 0
            ? ((groupData.webinars / totalWebinarsForRegions) * 100).toFixed(0)
            : 0,
      })
    );
    setWebinarsByRegion(preparedWebinarsByRegion);

    // Prepare data for Webinars by Country/Region Bar Chart and Cards
    const preparedWebinarsByCountryRegion = Object.entries(
      webinarsByCountryRegionMap
    )
      .map(([name, groupData]) => ({
        name,
        webinars: groupData.webinars,
        attendees: groupData.attendees,
        avgRetention:
          groupData.countRetention > 0
            ? (groupData.totalRetention / groupData.countRetention).toFixed(0)
            : 0,
      }))
      .sort((a, b) => b.webinars - a.webinars);
    setWebinarsByCountryRegion(preparedWebinarsByCountryRegion);

    // Prepare data for the new Regional Performance Analysis card
    const finalRegionalAnalysis = {};
    for (const regionName in regionalAnalysisProcessingMap) {
      const regionData = regionalAnalysisProcessingMap[regionName];
      const averageAttendance =
        regionData.totalWebinars > 0
          ? (regionData.totalAttendees / regionData.totalWebinars).toFixed(0)
          : 0;

      const sortedTopics = Object.entries(regionData.topics)
        .sort(([, countA], [, countB]) => countB - countA)
        .slice(0, 3)
        .map(([topicName]) => topicName);

      const breakdownArray = Object.entries(regionData.breakdown).map(
        ([name, webinars]) => ({ name, webinars })
      );

      let topPerformingSubRegion = "N/A";
      if (breakdownArray.length > 0) {
        breakdownArray.sort((a, b) => b.webinars - b.webinars);
        topPerformingSubRegion = breakdownArray[0].name;
      }

      finalRegionalAnalysis[regionName] = {
        averageAttendance,
        topPerformingSubRegion,
        popularTopics: sortedTopics,
        languages: Array.from(regionData.languages),
        breakdown: breakdownArray,
      };
    }
    setRegionalAnalysis(finalRegionalAnalysis);

    // Prepare data for Optimal Timing & Frequency card (Overall)
    const sortedBestDays = Object.entries(bestDaysMap)
      .sort(([, countA], [, countB]) => countB - countA)
      .slice(0, 2)
      .map(([day]) => day);

    // Sort mytHourFrequencies by count, then format to HH:MM AM/PM
    const sortedBestTimeSlots = Object.entries(mytHourFrequencies)
      .sort(([, countA], [, countB]) => countB - countA)
      .slice(0, 2)
      .map(([timeString]) => timeString); // Now directly using the precise time string

    const totalOverallTimeSlots = Object.values(timeOfDayCounts).reduce(
      (sum, count) => sum + count,
      0
    );
    const timeDistributionPercentages = Object.entries(timeOfDayCounts).map(
      ([period, count]) => ({
        period,
        percentage:
          totalOverallTimeSlots > 0
            ? ((count / totalOverallTimeSlots) * 100).toFixed(0)
            : 0,
      })
    );

    setOptimalTimingFrequency({
      bestDays: sortedBestDays.length > 0 ? sortedBestDays : ["N/A"],
      bestTimeSlots:
        sortedBestTimeSlots.length > 0 ? sortedBestTimeSlots : ["N/A"], // Use sortedBestTimeSlots directly
      averageDuration:
        durationCount > 0 ? (totalDurationSum / durationCount).toFixed(0) : 0,
      timeDistribution: timeDistributionPercentages,
    });

    // Prepare data for Top Performing Topics card
    const highestAttendanceRateTopics = Object.entries(
      topicAttendancePerformance
    )
      .map(([topic, metrics]) => ({
        name: topic,
        attendanceRate:
          metrics.totalRegistrations > 0
            ? (metrics.totalAttendees / metrics.totalRegistrations) * 100
            : 0,
      }))
      .filter((item) => item.attendanceRate > 0)
      .sort((a, b) => b.attendanceRate - a.attendanceRate)
      .slice(0, 3)
      .map((item) => `${item.name} (${item.attendanceRate.toFixed(1)}%)`);

    const highestAttendance =
      highestAttendanceRateTopics.length > 0
        ? highestAttendanceRateTopics
        : ["N/A"];

    // Using the calculatedAvgAttendanceTimeByTopic directly for Best Engagement
    const bestEngagement =
      calculatedAvgAttendanceTimeByTopic.length > 0
        ? calculatedAvgAttendanceTimeByTopic
            .slice(0, 3)
            .map((item) => `${item.name} (${item.avgTime} min)`)
        : ["N/A"];

    // Using tempWebinarsByLanguage directly for Popular Languages
    const popularLanguages =
      tempWebinarsByLanguage.length > 0
        ? tempWebinarsByLanguage
            .slice(0, 3)
            .map((item) => `${item.name} (${item.count} webinars)`)
        : ["N/A"];

    setTopPerformingTopics({
      highestAttendance,
      bestEngagement,
      popularLanguages,
    });

    // Prepare data for Language Distribution card
    const finalLanguageDistribution = {
      Africa: [],
      Latam: [],
      Asia: [],
    };

    for (const regionName in regionalAnalysisProcessingMap) {
      const regionData = regionalAnalysisProcessingMap[regionName];
      const sortedLanguages = Object.entries(regionData.languageCounts)
        .sort(([, countA], [, countB]) => countB - countA)
        .slice(0, 3)
        .map(([lang, count]) => ({ language: lang, webinars: count }));

      finalLanguageDistribution[regionName] = sortedLanguages;
    }
    setLanguageDistribution(finalLanguageDistribution);

    console.log("Webinars by Language data for chart:", tempWebinarsByLanguage);

    // Also calculate trend data based on filtered data
    calculateTrendAnalysisData(filteredData);

    // Calculate topic recommendations
    const topicRecommendations = {
      strong: [],
      average: [],
      poor: [],
    };

    // Calculate overall average attendance rate and average attendance time for all filtered webinars combined
    let overallTotalRegistrations = filteredData.reduce(
      (sum, row) => sum + (row["No. of registrations"] || 0),
      0
    );
    let overallTotalAttendees = filteredData.reduce(
      (sum, row) => sum + (row["No. of attendees"] || 0),
      0
    );
    let overallTotalAvgTimeSum = filteredData.reduce(
      (sum, row) =>
        sum +
        (typeof row["Average attendance time"] === "number"
          ? row["Average attendance time"]
          : 0),
      0
    );
    let overallValidAvgTimeCount = filteredData.filter(
      (row) => typeof row["Average attendance time"] === "number"
    ).length;

    const globalAvgAttendanceRate =
      overallTotalRegistrations > 0
        ? (overallTotalAttendees / overallTotalRegistrations) * 100
        : 0;
    const globalAvgAttendanceTime =
      overallValidAvgTimeCount > 0
        ? overallTotalAvgTimeSum / overallValidAvgTimeCount
        : 0;

    // Define performance tiers relative to global averages
    const strongThresholdRate = globalAvgAttendanceRate * 1.15;
    const poorThresholdRate = globalAvgAttendanceRate * 0.85;

    const strongThresholdTime = globalAvgAttendanceTime * 1.15;
    const poorThresholdTime = globalAvgAttendanceTime * 0.85;

    for (const topic in topicAttendancePerformance) {
      const metrics = topicAttendancePerformance[topic];
      // Calculate topic-specific average time and attendance rate
      const topicAvgTime =
        metrics.webinarCount > 0
          ? metrics.totalAvgTime / metrics.webinarCount
          : 0;
      const topicAttendanceRate =
        metrics.totalRegistrations > 0
          ? (metrics.totalAttendees / metrics.totalRegistrations) * 100
          : 0;

      let performance = "Average";

      // Criteria for Strong: Both rate and time are strong
      if (
        topicAttendanceRate >= strongThresholdRate &&
        topicAvgTime >= strongThresholdTime
      ) {
        performance = "Strong";
      }
      // Criteria for Poor: Either rate or time is poor (or both)
      else if (
        topicAttendanceRate <= poorThresholdRate ||
        topicAvgTime <= poorThresholdTime
      ) {
        performance = "Poor";
      }

      topicRecommendations[performance.toLowerCase()].push({
        name: topic,
        attendanceRate: topicAttendanceRate.toFixed(1),
        avgTime: topicAvgTime.toFixed(0),
      });
    }

    // Sort the recommendations within each category for consistent display
    topicRecommendations.strong.sort(
      (a, b) => b.attendanceRate - a.attendanceRate
    );
    topicRecommendations.average.sort(
      (a, b) => b.attendanceRate - a.attendanceRate
    );
    topicRecommendations.poor.sort(
      (a, b) => a.attendanceRate - b.attendanceRate
    );

    setTopicRecommendations(topicRecommendations);

    // Process and store optimal timing by country for each metric
    const webinarsOptimalTiming = findOptimalTiming(
      countryDayTimeCounts,
      "Webinars"
    );
    const registrationsOptimalTiming = findOptimalTiming(
      countryDayRegistrationCounts,
      "Registrations"
    );
    const attendanceOptimalTiming = findOptimalTiming(
      countryDayAttendanceCounts,
      "Attendees"
    );

    setOptimalTimingByCountry(webinarsOptimalTiming);
    setOptimalRegistrationTiming(registrationsOptimalTiming);
    setOptimalAttendanceTiming(attendanceOptimalTiming);

    // Log the data to console for debugging
    console.log("Optimal Webinars Timing by Country:", webinarsOptimalTiming);
    console.log(
      "Optimal Registrations Timing by Country:",
      registrationsOptimalTiming
    );
    console.log(
      "Optimal Attendance Timing by Country:",
      attendanceOptimalTiming
    );
  };

  // Function to calculate trend analysis data based on filter type
  const calculateTrendAnalysisData = (data) => {
    const trendDataMap = {
      month: {},
      dayOfWeek: {},
      topic: {},
      country: {},
      language: {},
    };

    const monthOrder = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const dayOrder = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];

    data.forEach((row) => {
      const registrations = row["No. of registrations"] || 0;
      const attendees = row["No. of attendees"] || 0;

      // By Month
      if (row["Date"]) {
        try {
          const dateObj = new Date(row["Date"]);
          if (!isNaN(dateObj.getTime())) {
            const monthName = dateObj.toLocaleString("en-US", {
              month: "short",
            });
            if (!trendDataMap.month[monthName]) {
              trendDataMap.month[monthName] = {
                totalReg: 0,
                totalAtt: 0,
                count: 0,
              };
            }
            trendDataMap.month[monthName].totalReg += registrations;
            trendDataMap.month[monthName].totalAtt += attendees;
            trendDataMap.month[monthName].count++;
          }
        } catch (e) {
          console.warn(
            "Could not parse date for month trend analysis:",
            row["Date"],
            e
          );
        }
      }

      // By Day of Week
      if (row["Date"]) {
        try {
          const dateObj = new Date(row["Date"]);
          if (!isNaN(dateObj.getTime())) {
            const dayName = dateObj.toLocaleString("en-US", {
              weekday: "long",
            });
            if (!trendDataMap.dayOfWeek[dayName]) {
              trendDataMap.dayOfWeek[dayName] = {
                totalReg: 0,
                totalAtt: 0,
                count: 0,
              };
            }
            trendDataMap.dayOfWeek[dayName].totalReg += registrations;
            trendDataMap.dayOfWeek[dayName].totalAtt += attendees;
            trendDataMap.dayOfWeek[dayName].count++;
          }
        } catch (e) {
          console.warn(
            "Could not parse date for day of week trend analysis:",
            row["Date"],
            e
          );
        }
      }

      // By Topic
      if (row["Webinar Topics"]) {
        const topic = row["Webinar Topics"];
        if (!trendDataMap.topic[topic]) {
          trendDataMap.topic[topic] = { totalReg: 0, totalAtt: 0, count: 0 };
        }
        trendDataMap.topic[topic].totalReg += registrations;
        trendDataMap.topic[topic].totalAtt += attendees;
        trendDataMap.topic[topic].count++;
      }

      // By Country
      if (row["Countries"]) {
        const country = row["Countries"];
        if (!trendDataMap.country[country]) {
          trendDataMap.country[country] = {
            totalReg: 0,
            totalAtt: 0,
            count: 0,
          };
        }
        trendDataMap.country[country].totalReg += registrations;
        trendDataMap.country[country].totalAtt += attendees;
        trendDataMap.country[country].count++;
      }

      // By Language
      if (row["Languages"]) {
        const language = row["Languages"];
        if (!trendDataMap.language[language]) {
          trendDataMap.language[language] = {
            totalReg: 0,
            totalAtt: 0,
            count: 0,
          };
        }
        trendDataMap.language[language].totalReg += registrations;
        trendDataMap.language[language].totalAtt += attendees;
        trendDataMap.language[language].count++;
      }
    });

    // Process and calculate rates for each category
    const processCategoryData = (map, sortOrder = null) => {
      let processedData = Object.entries(map).map(
        ([name, { totalReg, totalAtt, count }]) => {
          const registrationRate =
            totalReg > 0 ? (totalAtt / totalReg) * 100 : 0;
          const attendanceRate = count > 0 ? totalAtt / count : 0; // Avg attendees per webinar for that category
          return {
            name,
            attendanceRate: parseFloat(attendanceRate.toFixed(2)),
            registrationRate: parseFloat(registrationRate.toFixed(2)),
          };
        }
      );

      if (sortOrder) {
        processedData = processedData.sort(
          (a, b) => sortOrder.indexOf(a.name) - sortOrder.indexOf(b.name)
        );
      } else {
        processedData = processedData.sort(
          (a, b) => b.attendanceRate - a.attendanceRate
        ); // Default sort by attendance rate descending
      }
      return processedData;
    };

    // Store processed data for each filter type
    setTrendData({
      month: processCategoryData(trendDataMap.month, monthOrder),
      dayOfWeek: processCategoryData(trendDataMap.dayOfWeek, dayOrder),
      topic: processCategoryData(trendDataMap.topic),
      country: processCategoryData(trendDataMap.country),
      language: processCategoryData(trendDataMap.language),
    });
  };

  // Effect to update dashboard data when filters change
  useEffect(() => {
    if (csvData.length > 0) {
      calculateFilteredData(
        csvData,
        selectedLocations,
        selectedLanguages,
        selectedTopics,
        selectedStartDate,
        selectedEndDate
      );
    }
  }, [
    selectedLocations,
    selectedLanguages,
    selectedTopics,
    selectedStartDate,
    selectedEndDate,
    csvData,
  ]);

  // Set initial message on component mount and load PDF scripts
  useEffect(() => {
    setMessage("Please upload your CSV file to view the dashboard.");

    // Dynamically load jsPDF and html2canvas
    const loadScript = (src, id, callback) => {
      if (document.getElementById(id)) {
        if (callback) callback();
        return;
      }
      const script = document.createElement("script");
      script.src = src;
      script.id = id;
      script.onload = () => {
        console.log(`${id} loaded successfully.`);
        if (callback) callback();
      };
      script.onerror = () => console.error(`Failed to load ${id}.`);
      document.head.appendChild(script);
    };

    // Load jsPDF first, then html2canvas, then set pdfLibrariesLoaded to true
    loadScript(
      "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
      "jspdf-script",
      () => {
        loadScript(
          "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js",
          "html2canvas-script",
          () => {
            setPdfLibrariesLoaded(true); // Set true only after both are loaded
          }
        );
      }
    );
  }, []); // Empty dependency array ensures this runs only once on mount

  // Make generateTopicInsights function accessible
  const generateTopicInsights = async () => {
    if (csvData.length === 0) {
      setTopicInsights(
        "Please upload a CSV and generate the report first to get webinar insights."
      );
      return;
    }

    setIsLoadingInsights(true);
    setTopicInsights("Generating insights... this might take a moment.");

    // Prepare a comprehensive summary of dashboard data for the LLM
    const summaryData = {
      overallMetrics: {
        totalWebinars,
        totalRegistrations,
        totalAttendees,
        attendeesRate: parseFloat(attendeesRate), // Use attendeesRate
        avgAttendanceTime: parseFloat(avgAttendanceTime),
        medianAttendanceTime: parseFloat(medianAttendanceTime),
        overallAvgSessionLength: parseFloat(overallAvgSessionLength),
      },
      topPerformers: {
        languages: webinarsByLanguage.slice(0, 3),
        countries: webinarsByCountry.slice(0, 3),
        topicsByCount: webinarsByTopic.slice(0, 3),
        topicsByAttendance: attendanceByTopic.slice(0, 3),
        topicsByAvgTime: avgAttendanceTimeByTopic.slice(0, 3),
      },
      regionalBreakdown: regionalAnalysis,
      optimalTiming: optimalTimingFrequency,
      // Pass optimal timing by country for each metric
      optimalTimingByCountryWebinars: optimalTimingByCountry,
      optimalTimingByCountryRegistrations: optimalRegistrationTiming,
      optimalTimingByCountryAttendees: optimalAttendanceTiming,
      topicPerformanceRecommendations: topicRecommendations, // Including the strong/average/poor breakdown
    };

    const prompt = `${defaultInsightPromptText}
    \nHere's the summarized webinar data:\n${JSON.stringify(
      summaryData,
      null,
      2
    )}
    \nPlease also provide ${defaultNumSuggestions} suggestions for future webinar topics and strategies based on this data.
    \nFormat your response as a concise paragraph for analysis, followed by a bulleted list of suggestions and a final section for actionable recommendations.`;
    try {
      let chatHistory = [];
      chatHistory.push({ role: "user", parts: [{ text: prompt }] });
      const payload = { contents: chatHistory };
      const apiKey = "AIzaSyAeLxBL8mZTqanjSatPtrRom_T03jmctzw";
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (
        result.candidates &&
        result.candidates.length > 0 &&
        result.candidates[0].content &&
        result.candidates[0].content.parts &&
        result.candidates[0].content.parts.length > 0
      ) {
        const text = result.candidates[0].content.parts[0].text;
        setTopicInsights(text);
      } else {
        setTopicInsights(
          "Failed to generate insights. Unexpected API response structure."
        );
        console.error("Unexpected API response:", result);
      }
    } catch (error) {
      setTopicInsights("Error generating insights. Please try again.");
      console.error("Error calling Gemini API:", error);
    } finally {
      setIsLoadingInsights(false);
    }
  };

  // Function to handle PDF download (now image-based)
  const handleDownloadPdf = async () => {
    console.log("Attempting PDF download (image-based)...");
    console.log("pdfLibrariesLoaded:", pdfLibrariesLoaded);
    console.log("window.jsPDF:", window.jsPDF);
    console.log("window.html2canvas:", window.html2canvas);

    if (!pdfLibrariesLoaded) {
      console.error(
        "PDF libraries (jsPDF and html2canvas) are not yet loaded. Please try again in a moment."
      );
      setMessage(
        "PDF libraries are still loading. Please wait a moment and try again."
      );
      return;
    }

    if (!dashboardRef.current) {
      setMessage(
        "Dashboard content not found for screenshot. Please ensure the dashboard is rendered."
      );
      return;
    }

    setMessage("Generating PDF... This may take a moment.");

    try {
      // Removed setIsPdfGenerating(true) from here to ensure only the selected tab is visible
      // The visibility logic for trend analysis tabs is now solely based on selectedTrendFilter

      // Allow a brief moment for the DOM to reflow with the new visibility
      await new Promise((resolve) => setTimeout(resolve, 500)); // Increased delay for safety

      // Capture the dashboard content as a canvas
      const canvas = await window.html2canvas(dashboardRef.current, {
        scale: 2, // Increase scale for better resolution
        useCORS: true, // Enable cross-origin image loading if necessary
        logging: true, // Enable logging for debugging
        windowWidth: document.documentElement.offsetWidth, // Capture full width
        windowHeight: document.documentElement.offsetHeight, // Capture full height
        scrollX: 0, // Ensure capture starts from top-left
        scrollY: 0,
        // Explicitly set width/height to ensure full content is rendered
        width: dashboardRef.current.scrollWidth,
        height: dashboardRef.current.scrollHeight,
      });

      const imgData = canvas.toDataURL("image/png");

      let pdf;
      // Try to initialize jsPDF from window.jspdf.jsPDF first, then fallback to window.jsPDF
      if (window.jspdf && typeof window.jspdf.jsPDF === "function") {
        pdf = new window.jspdf.jsPDF("p", "mm", "a4");
        console.log("jsPDF initialized via window.jspdf.jsPDF");
      } else if (typeof window.jsPDF === "function") {
        pdf = new window.jsPDF("p", "mm", "a4");
        console.log("jsPDF initialized via window.jsPDF");
      } else {
        console.error("jsPDF constructor not found. Cannot generate PDF.");
        setMessage(
          "PDF generation failed: jsPDF library not properly initialized."
        );
        return;
      }

      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      // Add the first page
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Add more pages if the content overflows
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save("webinar_dashboard_report.pdf");
      setMessage("PDF generated successfully!");
    } catch (error) {
      console.error("Error generating PDF screenshot:", error);
      setMessage(
        "Error generating PDF. Please try again or check console for details."
      );
    } finally {
      // Ensure isPdfGenerating is set back to false after capture (or error)
      setIsPdfGenerating(false); // Still good to reset this if it were used elsewhere
    }
  };

  const COLORS = [
    "#667EEA",
    "#48BB78",
    "#ECC94B",
    "#ED8936",
    "#9F7AEA",
    "#4299E1",
    "#F56565",
    "#A0AEC0",
    "#718096",
    "#C05621",
    "#D53F8C",
    "#6B46C1",
    "#2C5282",
    "#00A3C4",
    "#00B5AD",
    "#9AE6B4",
    "#FEFCBF",
    "#FEEBC8",
    "#FBD38D",
  ];

  // Custom label for Pie Chart slices (retained for the Webinars by Region chart)
  const renderCustomizedLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
    name,
    value,
  }) => {
    const RADIAN = Math.PI / 180;
    const x = cx + outerRadius * Math.cos(-midAngle * RADIAN);
    const y = cy + outerRadius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? "start" : "end"}
        dominantBaseline="central"
        fontSize="12"
      >
        {`${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
      </text>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-4 font-sans flex flex-col items-center text-gray-100">
      {/* Tailwind CSS CDN */}
      <script src="https://cdn.tailwindcss.com"></script>
      {/* Inter font */}
      <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
        rel="stylesheet"
      />
      {/* jsPDF and html2canvas CDN scripts are now loaded dynamically in useEffect */}

      <style>{`
        body { font-family: 'Inter', sans-serif; }
        .card {
          background-color: #2D3748; /* Darker gray for cards */
          border-radius: 0.75rem; /* rounded-xl */
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          padding: 1.5rem;
        }
        .chart-container {
          background-color: #2D3748;
          border-radius: 0.75rem;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          padding: 1.5rem;
        }
        .recharts-tooltip-wrapper {
          background-color: rgba(45, 55, 72, 0.9) !important; /* Tooltip background */
          border-radius: 0.5rem !important;
          border: none !important;
          box-shadow: 0px 2px 10px rgba(0,0,0,0.2) !important;
        }
        .recharts-tooltip-label {
          color: #E2E8F0 !important; /* Tooltip label color */
          font-weight: bold !important;
        }
        .recharts-tooltip-item {
          color: #CBD5E0 !important; /* Tooltip item color */
        }
        .recharts-surface {
          overflow: visible; /* Ensure tooltips are not clipped */
        }
        .recharts-cartesian-axis-tick-value {
          fill: #A0AEC0; /* Axis tick label color - removed !important */
        }
        .recharts-legend-item-text {
          color: #CBD5E0 !important; /* Legend text color */
        }

        /* Custom Tooltip for KPI cards */
        .kpi-tooltip-container {
          position: relative;
          display: inline-block; /* Or block, depending on layout */
        }

        .kpi-tooltip {
          visibility: hidden;
          background-color: rgba(45, 55, 72, 0.9);
          color: #E2E8F0;
          text-align: center;
          border-radius: 6px;
          padding: 8px 12px;
          position: absolute;
          z-index: 1000;
          bottom: 125%; /* Position above the text */
          left: 50%;
          transform: translateX(-50%);
          opacity: 0;
          transition: opacity 0.3s;
          white-space: nowrap; /* Prevent text wrapping */
          font-size: 0.9rem;
        }

        .kpi-tooltip::after {
          content: "";
          position: absolute;
          top: 100%; /* At the bottom of the tooltip */
          left: 50%;
          margin-left: -5px;
          border-width: 5px;
          border-style: solid;
          border-color: rgba(45, 55, 72, 0.9) transparent transparent transparent;
        }

        .kpi-tooltip-container:hover .kpi-tooltip {
          visibility: visible;
          opacity: 1;
        }

        /* Styles for hidden tab content */
        .hidden-tab-content {
            display: none; /* Use display: none for hiding */
        }
      `}</style>

      <div
        ref={dashboardRef}
        className="w-full max-w-6xl bg-gray-800 rounded-xl shadow-2xl p-8 mb-8"
      >
        <h1 className="text-4xl font-extrabold text-white mb-6 text-center">
          Webinar Performance Dashboard
        </h1>
        <p className="text-gray-400 mb-8 text-center">{message}</p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
          <label
            htmlFor="csv-upload"
            className="cursor-pointer bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 flex items-center justify-center"
          >
            Upload CSV File
            <input
              id="csv-upload"
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              ref={fileInputRef}
              className="hidden"
            />
          </label>
          <button
            onClick={handleGenerateReport}
            className={`font-semibold py-3 px-6 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 flex items-center justify-center
              ${
                uploadedFileContent
                  ? "bg-green-600 hover:bg-green-700 text-white"
                  : "bg-gray-600 text-gray-400 cursor-not-allowed"
              }`}
            disabled={!uploadedFileContent}
          >
            Generate Report
          </button>
          {csvData.length > 0 && (
            <>
              <button
                onClick={handleDownloadPdf}
                className={`font-semibold py-3 px-6 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 flex items-center justify-center
                  ${
                    pdfLibrariesLoaded
                      ? "bg-blue-500 hover:bg-blue-600 text-white"
                      : "bg-gray-600 text-gray-400 cursor-not-allowed"
                  }`}
                disabled={!pdfLibrariesLoaded}
              >
                Download PDF
              </button>
              <button
                onClick={() => {
                  setCsvData([]);
                  setHeaders([]);
                  setUploadedFileContent(null);
                  setMessage("Dashboard cleared. Upload a new CSV file.");
                  if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                  }
                  resetAggregatedData();
                }}
                className="bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 flex items-center justify-center"
              >
                Clear Dashboard
              </button>
            </>
          )}
        </div>

        {/* New Filter Card */}
        {csvData.length > 0 && (
          <div className="chart-container lg:col-span-3 mt-8 p-6">
            <h2 className="text-2xl font-semibold text-white mb-6 text-center">
              Filter Data
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
              {" "}
              {/* Increased grid columns to 5 */}
              {/* Location Filter */}
              <div className="flex flex-col">
                <label
                  htmlFor="location-filter"
                  className="text-gray-300 text-sm mb-2 text-center"
                >
                  Location ({availableLocations.length} options)
                </label>
                <MultiSelectDropdown
                  options={availableLocations}
                  selectedValues={selectedLocations}
                  onSelectionChange={setSelectedLocations}
                  placeholder="Select Locations"
                  label="Locations"
                  allOptionText="All Locations" // Passed explicit "All Locations" text
                />
              </div>
              {/* Language Filter */}
              <div className="flex flex-col">
                <label
                  htmlFor="language-filter"
                  className="text-gray-300 text-sm mb-2 text-center"
                >
                  Language ({availableLanguages.length} options)
                </label>
                <MultiSelectDropdown
                  options={availableLanguages}
                  selectedValues={selectedLanguages}
                  onSelectionChange={setSelectedLanguages}
                  placeholder="Select Languages"
                  label="Languages"
                  allOptionText="All Languages" // Passed explicit "All Languages" text
                />
              </div>
              {/* Topic Filter */}
              <div className="flex flex-col">
                <label
                  htmlFor="topic-filter"
                  className="text-gray-300 text-sm mb-2 text-center"
                >
                  Webinar Topic ({availableTopics.length} options)
                </label>
                <MultiSelectDropdown
                  options={availableTopics}
                  selectedValues={selectedTopics}
                  onSelectionChange={setSelectedTopics}
                  placeholder="Select Topics"
                  label="Webinar Topics"
                  allOptionText="All Webinars" // Passed explicit "All Webinars" text
                />
              </div>
              {/* Start Date Filter */}
              <div className="flex flex-col">
                <label
                  htmlFor="start-date-filter"
                  className="text-gray-300 text-sm mb-2 text-center"
                >
                  Start Date
                </label>
                <input
                  type="date"
                  id="start-date-filter"
                  value={selectedStartDate}
                  onChange={(e) => setSelectedStartDate(e.target.value)}
                  className="p-2 rounded-md bg-gray-700 text-gray-200 border border-gray-600 focus:outline-none focus:border-blue-500"
                />
              </div>
              {/* End Date Filter */}
              <div className="flex flex-col">
                <label
                  htmlFor="end-date-filter"
                  className="text-gray-300 text-sm mb-2 text-center"
                >
                  End Date
                </label>
                <input
                  type="date"
                  id="end-date-filter"
                  value={selectedEndDate}
                  onChange={(e) => setSelectedEndDate(e.target.value)}
                  className="p-2 rounded-md bg-gray-700 text-gray-200 border border-gray-600 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
            {/* Removed the instructional remark */}
          </div>
        )}

        {csvData.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
            {/* KPI Cards */}
            <div className="card text-center">
              <h3 className="text-lg font-medium text-gray-300">
                Total Webinars
              </h3>
              <p className="text-4xl font-bold text-blue-400 mt-2">
                {totalWebinars}
              </p>
            </div>
            <div className="card text-center">
              <h3 className="text-lg font-medium text-gray-300">
                Total Registrations
              </h3>
              <p className="text-4xl font-bold text-green-400 mt-2">
                {totalRegistrations}
              </p>
            </div>
            <div className="card text-center">
              <h3 className="text-lg font-medium text-gray-300">
                Total Attendees
              </h3>
              <p className="text-4xl font-bold text-yellow-400 mt-2">
                {totalAttendees}
              </p>
            </div>
            {/* Attendees Rate Card with Custom Tooltip */}
            <div className="card text-center relative">
              <h3 className="text-lg font-medium text-gray-300">
                Attendees Rate
              </h3>
              <div className="kpi-tooltip-container">
                <p className="text-4xl font-bold text-pink-400 mt-2">
                  {attendeesRate}%
                </p>
                <div className="kpi-tooltip">
                  Total Attendees / Total Registrations × 100
                </div>
              </div>
            </div>
            <div className="card text-center">
              <h3 className="text-lg font-medium text-gray-300">
                Avg. Attendance Time
              </h3>
              <div className="kpi-tooltip-container">
                <p className="text-4xl font-bold text-indigo-400 mt-2">
                  {avgAttendanceTime} min
                </p>
                <div className="kpi-tooltip">
                  Total Average Attendance Time / Number of Webinars with
                  Attendance Time
                </div>
              </div>
            </div>
            <div className="card text-center">
              <h3 className="text-lg font-medium text-gray-300">
                Median Attendance Time
              </h3>
              <div className="kpi-tooltip-container">
                <p className="text-4xl font-bold text-teal-400 mt-2">
                  {medianAttendanceTime} min
                </p>
                <div className="kpi-tooltip">
                  Sum of Median Attendance for all Webinars / Total Number of
                  Webinars
                </div>
              </div>
            </div>

            {/* New Cards: Optimal Timing & Frequency and Top Performing Topics */}
            <div className="chart-container lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Optimal Timing & Frequency Card */}
              <div className="card p-6">
                <h3 className="text-2xl font-semibold text-white mb-4 flex items-center">
                  <svg
                    className="w-6 h-6 mr-2 text-blue-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    ></path>
                  </svg>
                  Optimal Timing & Frequency (Overall)
                </h3>
                <ul className="list-disc list-inside text-gray-200 text-sm space-y-2">
                  <li className="flex w-full items-start">
                    <span className="min-w-[160px] font-medium pr-2">
                      Best Days:
                    </span>
                    <span className="flex-1">
                      {optimalTimingFrequency.bestDays.join(", ") || "N/A"}
                    </span>
                  </li>
                  <li className="flex w-full items-start">
                    <span className="min-w-[160px] font-medium pr-2">
                      Best Time Slots:
                    </span>
                    <span className="flex-1">
                      {optimalTimingFrequency.bestTimeSlots.length > 0
                        ? optimalTimingFrequency.bestTimeSlots.join(", ")
                        : "N/A"}
                    </span>
                  </li>
                  <li className="flex w-full items-start">
                    <span className="min-w-[160px] font-medium pr-2">
                      Average Duration:
                    </span>
                    <span className="flex-1">
                      {optimalTimingFrequency.averageDuration} minutes
                    </span>
                  </li>
                  <li className="flex w-full items-start">
                    <span className="min-w-[160px] font-medium pr-2">
                      Time Distribution:
                    </span>
                    <span className="flex-1 flex flex-wrap">
                      {Array.isArray(optimalTimingFrequency.timeDistribution) &&
                      optimalTimingFrequency.timeDistribution.length > 0 ? (
                        optimalTimingFrequency.timeDistribution.map(
                          (item, i) => (
                            <span key={i} className="mr-1">
                              {item.period} {item.percentage}%
                              {i <
                              optimalTimingFrequency.timeDistribution.length - 1
                                ? ","
                                : ""}
                            </span>
                          )
                        )
                      ) : (
                        <span>N/A</span>
                      )}
                    </span>
                  </li>
                </ul>
              </div>

              {/* Top Performing Topics Card */}
              <div className="card p-6">
                <h3 className="text-2xl font-semibold text-white mb-4 flex items-center">
                  <svg
                    className="w-6 h-6 mr-2 text-green-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    ></path>
                  </svg>
                  Top Performing Topics
                </h3>
                <ul className="list-disc list-inside text-gray-200 text-sm space-y-2">
                  <li className="flex w-full items-start">
                    <span className="min-w-[160px] font-medium pr-2">
                      Highest Attendance:
                    </span>
                    <span className="flex-1">
                      {topPerformingTopics.highestAttendance.join(", ") ||
                        "N/A"}
                    </span>
                  </li>
                  {/* Conditionally render Best Engagement */}
                  {topPerformingTopics.bestEngagement &&
                  topPerformingTopics.bestEngagement.length > 0 ? (
                    <li className="flex w-full items-start">
                      <span className="min-w-[160px] font-medium pr-2">
                        Best Engagement:
                      </span>
                      <span className="flex-1">
                        {topPerformingTopics.bestEngagement.join(", ")}
                      </span>
                    </li>
                  ) : (
                    <li className="flex w-full items-start">
                      <span className="min-w-[160px] font-medium pr-2">
                        Best Engagement:
                      </span>
                      <span className="flex-1">N/A</span>
                    </li>
                  )}
                  {/* Conditionally render Popular Languages */}
                  {topPerformingTopics.popularLanguages &&
                  topPerformingTopics.popularLanguages.length > 0 ? (
                    <li className="flex w-full items-start">
                      <span className="min-w-[160px] font-medium pr-2">
                        Popular Languages:
                      </span>
                      <span className="flex-1">
                        {topPerformingTopics.popularLanguages.join(", ")}
                      </span>
                    </li>
                  ) : (
                    <li className="flex w-full items-start">
                      <span className="min-w-[160px] font-medium pr-2">
                        Popular Languages:
                      </span>
                      <span className="flex-1">N/A</span>
                    </li>
                  )}
                </ul>
              </div>
            </div>

            {/* Optimal Timing by Country Card - Always rendered if CSV data exists */}
            {csvData.length > 0 && (
              <div className="chart-container lg:col-span-3 mt-8 p-6">
                <h3 className="text-2xl font-semibold text-white mb-4 flex items-center justify-center">
                  <svg
                    className="w-6 h-6 mr-2 text-blue-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    ></path>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    ></path>
                  </svg>
                  Optimal Timing by Country
                </h3>
                {/* Tabs for Optimal Timing */}
                <div className="flex border-b border-gray-700 mb-4">
                  <button
                    className={`py-2 px-4 text-sm font-medium focus:outline-none ${
                      selectedTimingTab === "webinars"
                        ? "border-b-2 border-blue-400 text-blue-400"
                        : "text-gray-400 hover:text-gray-200"
                    }`}
                    onClick={() => setSelectedTimingTab("webinars")}
                  >
                    By Webinars
                  </button>
                  <button
                    className={`py-2 px-4 text-sm font-medium focus:outline-none ${
                      selectedTimingTab === "registrations"
                        ? "border-b-2 border-green-400 text-green-400"
                        : "text-gray-400 hover:text-gray-200"
                    }`}
                    onClick={() => setSelectedTimingTab("registrations")}
                  >
                    By Registrations
                  </button>
                  <button
                    className={`py-2 px-4 text-sm font-medium focus:outline-none ${
                      selectedTimingTab === "attendance"
                        ? "border-b-2 border-yellow-400 text-yellow-400"
                        : "text-gray-400 hover:text-gray-200"
                    }`}
                    onClick={() => setSelectedTimingTab("attendance")}
                  >
                    By Attendance
                  </button>
                </div>

                {/* Render all tab content, use hidden-tab-content for inactive ones */}
                <div className="optimal-timing-content-wrapper">
                  <div
                    className={`optimal-timing-tab-pane ${
                      selectedTimingTab !== "webinars"
                        ? "hidden-tab-content"
                        : ""
                    }`}
                  >
                    <div className="overflow-x-auto">
                      <table className="min-w-full bg-gray-700 rounded-lg shadow-md text-gray-200">
                        <thead>
                          <tr className="bg-gray-600 text-gray-100 uppercase text-sm leading-normal">
                            <th className="py-3 px-6 text-left">Country</th>
                            <th className="py-3 px-6 text-left">Best Day</th>
                            <th className="py-3 px-6 text-left">
                              Best Time (MYT)
                            </th>
                            <th className="py-3 px-6 text-left">Webinars</th>
                          </tr>
                        </thead>
                        <tbody className="text-gray-300 text-sm font-light">
                          {optimalTimingByCountry.map((data, index) => (
                            <tr
                              key={index}
                              className="border-b border-gray-600 hover:bg-gray-600"
                            >
                              <td className="py-3 px-6 text-left whitespace-nowrap">
                                {data.country}
                              </td>
                              <td className="py-3 px-6 text-left">
                                {data.bestDay}
                              </td>
                              <td className="py-3 px-6 text-left">
                                {data.bestTime}
                              </td>
                              <td className="py-3 px-6 text-left">
                                {data.metricValue}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {optimalTimingByCountry.length === 0 && (
                      <p className="text-center text-gray-400 mt-4">
                        No optimal timing data available for webinars.
                      </p>
                    )}
                  </div>

                  <div
                    className={`optimal-timing-tab-pane ${
                      selectedTimingTab !== "registrations"
                        ? "hidden-tab-content"
                        : ""
                    }`}
                  >
                    <div className="overflow-x-auto">
                      <table className="min-w-full bg-gray-700 rounded-lg shadow-md text-gray-200">
                        <thead>
                          <tr className="bg-gray-600 text-gray-100 uppercase text-sm leading-normal">
                            <th className="py-3 px-6 text-left">Country</th>
                            <th className="py-3 px-6 text-left">Best Day</th>
                            <th className="py-3 px-6 text-left">
                              Best Time (MYT)
                            </th>
                            <th className="py-3 px-6 text-left">
                              Registrations
                            </th>
                          </tr>
                        </thead>
                        <tbody className="text-gray-300 text-sm font-light">
                          {optimalRegistrationTiming.map((data, index) => (
                            <tr
                              key={index}
                              className="border-b border-gray-600 hover:bg-gray-600"
                            >
                              <td className="py-3 px-6 text-left whitespace-nowrap">
                                {data.country}
                              </td>
                              <td className="py-3 px-6 text-left">
                                {data.bestDay}
                              </td>
                              <td className="py-3 px-6 text-left">
                                {data.bestTime}
                              </td>
                              <td className="py-3 px-6 text-left">
                                {data.metricValue}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {optimalRegistrationTiming.length === 0 && (
                      <p className="text-center text-gray-400 mt-4">
                        No optimal timing data available for registrations.
                      </p>
                    )}
                  </div>

                  <div
                    className={`optimal-timing-tab-pane ${
                      selectedTimingTab !== "attendance"
                        ? "hidden-tab-content"
                        : ""
                    }`}
                  >
                    <div className="overflow-x-auto">
                      <table className="min-w-full bg-gray-700 rounded-lg shadow-md text-gray-200">
                        <thead>
                          <tr className="bg-gray-600 text-gray-100 uppercase text-sm leading-normal">
                            <th className="py-3 px-6 text-left">Country</th>
                            <th className="py-3 px-6 text-left">Best Day</th>
                            <th className="py-3 px-6 text-left">
                              Best Time (MYT)
                            </th>
                            <th className="py-3 px-6 text-left">Attendees</th>
                          </tr>
                        </thead>
                        <tbody className="text-gray-300 text-sm font-light">
                          {optimalAttendanceTiming.map((data, index) => (
                            <tr
                              key={index}
                              className="border-b border-gray-600 hover:bg-gray-600"
                            >
                              <td className="py-3 px-6 text-left whitespace-nowrap">
                                {data.country}
                              </td>
                              <td className="py-3 px-6 text-left">
                                {data.bestDay}
                              </td>
                              <td className="py-3 px-6 text-left">
                                {data.bestTime}
                              </td>
                              <td className="py-3 px-6 text-left">
                                {data.metricValue}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {optimalAttendanceTiming.length === 0 && (
                      <p className="text-center text-gray-400 mt-4">
                        No optimal timing data available for attendance.
                      </p>
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-4 text-center">
                  * "Best Day" and "Best Time" indicate the day of the week and
                  hour of the day (AM/PM) that had the highest number of{" "}
                  {selectedTimingTab === "webinars"
                    ? "webinars"
                    : selectedTimingTab === "registrations"
                    ? "registrations"
                    : "attendees"}{" "}
                  for each respective country, based on the times present in the
                  CSV data.
                </p>
              </div>
            )}

            {/* Topic Recommendation Card with Tabs */}
            <div className="chart-container lg:col-span-3 mt-8 p-6">
              <h3 className="text-2xl font-semibold text-white mb-4 flex items-center">
                <svg
                  className="w-6 h-6 mr-2 text-yellow-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.002 12.002 0 002 12c0 2.753 1.043 5.483 2.924 7.595a11.99 11.99 0 0014.152 0C20.957 17.483 22 14.753 22 12c0-2.062-.354-4.043-1.037-5.836z"
                  ></path>
                </svg>
                Topic Recommendations
              </h3>
              <div className="flex border-b border-gray-700 mb-4">
                <button
                  className={`py-2 px-4 text-sm font-medium focus:outline-none ${
                    selectedRecommendationTab === "strong"
                      ? "border-b-2 border-green-400 text-green-400"
                      : "text-gray-400 hover:text-gray-200"
                  }`}
                  onClick={() => setSelectedRecommendationTab("strong")}
                >
                  Strong Performance ({topicRecommendations.strong.length})
                </button>
                <button
                  className={`py-2 px-4 text-sm font-medium focus:outline-none ${
                    selectedRecommendationTab === "average"
                      ? "border-b-2 border-blue-400 text-blue-400"
                      : "text-gray-400 hover:text-gray-200"
                  }`}
                  onClick={() => setSelectedRecommendationTab("average")}
                >
                  Average Performance ({topicRecommendations.average.length})
                </button>
                <button
                  className={`py-2 px-4 text-sm font-medium focus:outline-none ${
                    selectedRecommendationTab === "poor"
                      ? "border-b-2 border-red-400 text-red-400"
                      : "text-gray-400 hover:text-gray-200"
                  }`}
                  onClick={() => setSelectedRecommendationTab("poor")}
                >
                  Poor Performance ({topicRecommendations.poor.length})
                </button>
              </div>

              {/* Render all tab content, use hidden-tab-content for inactive ones */}
              <div className="topic-recommendations-content-wrapper">
                <div
                  className={`text-sm ${
                    selectedRecommendationTab !== "strong"
                      ? "hidden-tab-content"
                      : ""
                  }`}
                >
                  <ul className="list-disc list-inside space-y-1">
                    {topicRecommendations.strong.length > 0 ? (
                      topicRecommendations.strong.map((topic, i) => (
                        <li key={i}>
                          {topic.name} (Rate: {topic.attendanceRate}%, Avg Time:{" "}
                          {topic.avgTime} min)
                        </li>
                      ))
                    ) : (
                      <li>N/A</li>
                    )}
                  </ul>
                </div>
                <div
                  className={`text-sm ${
                    selectedRecommendationTab !== "average"
                      ? "hidden-tab-content"
                      : ""
                  }`}
                >
                  <ul className="list-disc list-inside space-y-1">
                    {topicRecommendations.average.length > 0 ? (
                      topicRecommendations.average.map((topic, i) => (
                        <li key={i}>
                          {topic.name} (Rate: {topic.attendanceRate}%, Avg Time:{" "}
                          {topic.avgTime} min)
                        </li>
                      ))
                    ) : (
                      <li>N/A</li>
                    )}
                  </ul>
                </div>
                <div
                  className={`text-sm ${
                    selectedRecommendationTab !== "poor"
                      ? "hidden-tab-content"
                      : ""
                  }`}
                >
                  <ul className="list-disc list-inside space-y-1">
                    {topicRecommendations.poor.length > 0 ? (
                      topicRecommendations.poor.map((topic, i) => (
                        <li key={i}>
                          {topic.name} (Rate: {topic.attendanceRate}%, Avg Time:{" "}
                          {topic.avgTime} min)
                        </li>
                      ))
                    ) : (
                      <li>N/A</li>
                    )}
                  </ul>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-4">
                Ratings are based on each topic's Attendance Rate and Average
                Attendance Time compared to the **averages of the currently
                filtered data**. Strong performance topics are at least 15%
                above average for both metrics. Poor performance topics are at
                least 15% below average for either metric.
              </p>
            </div>

            {/* Language Distribution Card */}
            <div className="chart-container lg:col-span-3 mt-8">
              <h2 className="text-2xl font-semibold text-white mb-6 text-center flex items-center justify-center">
                <svg
                  className="w-7 h-7 mr-2 text-purple-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M10.25 6H12a2 2 0 012 2v2.25m-4 12V10m0 0H8a2 2 0 01-2-2V6a2 2 0 012-2h4a2 2 0 012 2v2.25M10.25 6h.001M10.25 6a1 1 0 11-2 0 1 1 0 012 0zM12 20h9a1 1 0 001-1v-2a1 1 0 00-1-1h-9m-2 0H3a1 1 0 00-1 1v2a1 1 0 001 1h9m-2 0h-1l-1 4-1-4h-1"
                  ></path>
                </svg>
                Language Distribution
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {Object.keys(regionalAnalysis).map((regionName) => (
                  <div key={regionName} className="card p-6">
                    <h3 className="text-xl font-bold text-white mb-4">
                      {regionName}
                    </h3>
                    <ul className="list-none text-gray-200 text-sm space-y-2">
                      {/* Check if languageDistribution[regionName] is an array before mapping */}
                      {Array.isArray(languageDistribution[regionName]) &&
                      languageDistribution[regionName].length > 0 ? (
                        languageDistribution[regionName].map((lang, i) => (
                          <li
                            key={i}
                            className="flex justify-between items-center"
                          >
                            <span>{lang.language}</span>
                            <span className="font-semibold">
                              {lang.webinars} webinars
                            </span>
                          </li>
                        ))
                      ) : (
                        <li>N/A</li>
                      )}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            {/* Regional Performance Analysis Card */}
            <div className="chart-container lg:col-span-3 mt-8">
              <h2 className="text-2xl font-semibold text-white mb-6 text-center">
                Regional Performance Analysis
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {Object.keys(regionalAnalysis).map((regionName) => {
                  const regionData = regionalAnalysis[regionName];
                  if (!regionData) return null; // Defensive check for undefined region data object

                  // Ensure these are always treated as arrays with defensive checks
                  const popularTopics = Array.isArray(regionData.popularTopics)
                    ? regionData.popularTopics
                    : [];
                  const languages = Array.isArray(regionData.languages)
                    ? regionData.languages
                    : [];
                  const breakdown = Array.isArray(regionData.breakdown)
                    ? regionData.breakdown
                    : [];

                  return (
                    <div key={regionName} className="card p-6">
                      <h3 className="text-xl font-bold text-white mb-4">
                        {regionName}
                      </h3>
                      <div className="space-y-3">
                        <p className="text-gray-300">Average Attendance</p>
                        <p className="text-2xl font-bold text-blue-400">
                          {regionData.averageAttendance} Attendees
                        </p>

                        <p className="text-gray-300 mt-4">
                          Top Performing Sub-Region
                        </p>
                        <p className="text-lg font-semibold text-green-400">
                          {regionData.topPerformingSubRegion}
                        </p>

                        <p className="text-gray-300 mt-4">Popular Topics</p>
                        <ul className="list-disc list-inside text-gray-200">
                          {popularTopics.length > 0 ? (
                            popularTopics.map((topic, i) => (
                              <li key={i} className="text-xs">
                                {topic}
                              </li>
                            ))
                          ) : (
                            <li>N/A</li>
                          )}
                        </ul>

                        <p className="text-gray-300 mt-4">Languages</p>
                        <p className="text-xs text-gray-200">
                          {languages.join(", ") || "N/A"}
                        </p>

                        <p className="text-gray-300 mt-4">Regional Breakdown</p>
                        <ul className="list-disc list-inside text-gray-200">
                          {breakdown.length > 0 ? (
                            breakdown.map((item, i) => (
                              <li key={i} className="text-xs">
                                {item.name}: {item.webinars} webinars
                              </li>
                            ))
                          ) : (
                            <li>N/A</li>
                          )}
                        </ul>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Registrations and Attendees Line Chart - now spans full width */}
            <div className="chart-container lg:col-span-3">
              <h2 className="text-2xl font-semibold text-white mb-4 text-center">
                Registrations & Attendees Over Time
              </h2>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart
                  data={getFilteredData(
                    csvData,
                    selectedLocations,
                    selectedLanguages,
                    selectedTopics,
                    selectedStartDate,
                    selectedEndDate
                  )}
                  margin={{ top: 10, right: 30, left: 20, bottom: 80 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
                  <XAxis
                    dataKey="Date"
                    angle={-45}
                    textAnchor="end"
                    height={100}
                    tick={{ fill: "#A0AEC0", fontSize: 10 }}
                  />
                  <YAxis tick={{ fill: "#A0AEC0" }} />
                  <Tooltip cursor={{ stroke: "#A0AEC0", strokeWidth: 1 }} />
                  <Legend
                    wrapperStyle={{
                      paddingTop: "10px",
                      color: "#CBD5E0",
                      paddingRight: "20px",
                    }}
                  />
                  {headers.includes("No. of registrations") && (
                    <Line
                      type="monotone"
                      dataKey="No. of registrations"
                      stroke="#667EEA"
                      activeDot={{ r: 6 }}
                      strokeWidth={2}
                    />
                  )}
                  {headers.includes("No. of attendees") && (
                    <Line
                      type="monotone"
                      dataKey="No. of attendees"
                      stroke="#48BB78"
                      activeDot={{ r: 6 }}
                      strokeWidth={2}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* No. of Emails Line Chart - now spans full width */}
            {headers.includes("No. of emails") && (
              <div className="chart-container lg:col-span-3">
                <h2 className="text-2xl font-semibold text-white mb-4 text-center">
                  Number of Emails Sent Over Time
                </h2>
                <ResponsiveContainer width="100%" height={450}>
                  <LineChart
                    data={getFilteredData(
                      csvData,
                      selectedLocations,
                      selectedLanguages,
                      selectedTopics,
                      selectedStartDate,
                      selectedEndDate
                    )}
                    margin={{ top: 10, right: 30, left: 20, bottom: 120 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
                    <XAxis
                      dataKey="Date"
                      angle={-45}
                      textAnchor="end"
                      height={100}
                      tick={{ fill: "#A0AEC0", fontSize: 10 }}
                    />
                    <YAxis
                      domain={emailsYAxisDomain} // Dynamic domain
                      ticks={emailsYAxisTicks} // Dynamic ticks
                      tick={{ fill: "#A0AEC0" }}
                      interval={0}
                    />
                    <Tooltip cursor={{ fill: "rgba(0,0,0,0.2)" }} />
                    <Legend
                      wrapperStyle={{
                        paddingTop: "10px",
                        color: "#CBD5E0",
                        paddingRight: "20px",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="No. of emails"
                      stroke="#ECC94B"
                      activeDot={{ r: 6 }}
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Webinars by Language Bar Chart - now spans full width and is vertical */}
            {webinarsByLanguage.length > 0 && (
              <div className="chart-container lg:col-span-3">
                <h2 className="text-2xl font-semibold text-white mb-4 text-center">
                  Webinars by Language
                </h2>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart
                    data={webinarsByLanguage}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
                    <XAxis
                      type="category"
                      dataKey="name"
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      tick={{ fill: "#A0AEC0" }}
                    />
                    <YAxis type="number" tick={{ fill: "#A0AEC0" }} />
                    <Tooltip cursor={{ fill: "rgba(0,0,0,0.2)" }} />
                    <Bar dataKey="count" fill="#E53E3E" radius={[5, 5, 0, 0]}>
                      <LabelList
                        dataKey="count"
                        position="top"
                        fill="#CBD5E0"
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Webinars by Country Bar Chart (now in its own row, vertical) */}
            {webinarsByCountry.length > 0 && (
              <div className="chart-container lg:col-span-3">
                <h2 className="text-2xl font-semibold text-white mb-4 text-center">
                  Webinars by Country
                </h2>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart
                    data={webinarsByCountry}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
                    <XAxis
                      type="category"
                      dataKey="name"
                      angle={-45}
                      textAnchor="end"
                      height={120}
                      tick={{ fill: "#A0AEC0", fontSize: 10 }}
                      interval={0}
                    />
                    <YAxis type="number" tick={{ fill: "#A0AEC0" }} />
                    <Tooltip cursor={{ fill: "rgba(0,0,0,0.2)" }} />
                    <Bar dataKey="count" fill="#38B2AC" radius={[5, 5, 0, 0]}>
                      <LabelList
                        dataKey="count"
                        position="top"
                        fill="#CBD5E0"
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Webinars by Topic Bar Chart (vertical) - Reverted */}
            {webinarsByTopic.length > 0 && (
              <div className="chart-container lg:col-span-3">
                <h2 className="text-2xl font-semibold text-white mb-4 text-center">
                  Webinar Topics (Top 21)
                </h2>
                <ResponsiveContainer
                  width="100%"
                  height={400}
                  minHeight={400}
                  key={webinarsByTopic.length}
                >
                  <BarChart
                    data={webinarsByTopic}
                    margin={{ top: 5, right: 30, left: 20, bottom: 80 }}
                    barCategoryGap={3}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
                    <XAxis
                      type="category"
                      dataKey="name"
                      angle={-45}
                      textAnchor="end"
                      height={100}
                      tick={{ fill: "#A0AEC0", fontSize: 10 }}
                      interval={0}
                    />
                    <YAxis
                      type="number"
                      domain={webinarTopicsCountYAxisDomain}
                      ticks={webinarTopicsCountYAxisTicks}
                      tick={{ fill: "#A0AEC0" }}
                      interval={0}
                    />
                    <Tooltip cursor={{ fill: "rgba(0,0,0,0.2)" }} />
                    <Bar dataKey="count" fill="#F6AD55" radius={[5, 5, 0, 0]}>
                      <LabelList
                        dataKey="count"
                        position="top"
                        fill="#CBD5E0"
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Topics Attendance Overview Bar Chart - Reverted */}
            {attendanceByTopic.length > 0 && (
              <div className="chart-container lg:col-span-3">
                <h2 className="text-2xl font-semibold text-white mb-4 text-center">
                  Topics Attendance Overview
                </h2>
                <div className="text-right text-gray-400 mb-2">
                  Total Topics: {attendanceByTopic.length}
                </div>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart
                    data={attendanceByTopic}
                    margin={{ top: 5, right: 30, left: 20, bottom: 80 }}
                    barCategoryGap={10}
                  >
                    <CartesianGrid strokeDashArray="3 3" stroke="#4A5568" />
                    <XAxis
                      type="category"
                      dataKey="name"
                      angle={-45}
                      textAnchor="end"
                      height={100}
                      tick={{ fill: "#A0AEC0", fontSize: 10 }}
                      interval={0}
                    />
                    <YAxis
                      type="number"
                      dataKey="attendees"
                      domain={topicsAttendanceYAxisDomain}
                      ticks={topicsAttendanceYAxisTicks}
                      tick={{ fill: "#A0AEC0" }}
                      label={{
                        value: "Attendees",
                        angle: -90,
                        position: "insideLeft",
                        fill: "#A0AEC0",
                      }}
                      interval={0}
                    />
                    <Tooltip cursor={{ fill: "rgba(0,0,0,0.2)" }} />
                    <Bar
                      dataKey="attendees"
                      fill="#4299E1"
                      radius={[5, 5, 0, 0]}
                    >
                      <LabelList
                        dataKey="attendees"
                        position="top"
                        fill="#CBD5E0"
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Average Attendance Time by Topic Bar Chart - Kept as is */}
            {avgAttendanceTimeByTopic.length > 0 && (
              <div className="chart-container lg:col-span-3">
                <h2 className="text-2xl font-semibold text-white mb-4 text-center">
                  Average Attendance Time by Topic
                </h2>
                <div className="text-right text-gray-400 mb-2">
                  Avg. Session Length: {overallAvgSessionLength} minutes
                </div>
                <ResponsiveContainer width="100%" height={450}>
                  <BarChart
                    data={avgAttendanceTimeByTopic}
                    margin={{ top: 5, right: 30, left: 20, bottom: 80 }}
                    barCategoryGap={10}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(255, 255, 255, 0.1)"
                    />
                    <XAxis
                      type="category"
                      dataKey="name"
                      angle={-45}
                      textAnchor="end"
                      height={100}
                      tick={{ fill: "#A0AEC0", fontSize: 10 }}
                      interval={0}
                    />
                    <YAxis
                      type="number"
                      dataKey="avgTime"
                      domain={[0, 75]}
                      ticks={[0, 15, 30, 45, 60, 75]}
                      tick={{ fill: "#FFFFFF" }}
                      label={{
                        value: "Minutes",
                        angle: -90,
                        position: "insideLeft",
                        fill: "#A0AEC0",
                      }}
                      interval={0}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(0,0,0,0.2)" }}
                      formatter={(value) => [`${value} min`, "Average Time"]}
                    />
                    <Bar dataKey="avgTime" fill="#48BB78" radius={[5, 5, 0, 0]}>
                      <LabelList
                        dataKey="avgTime"
                        position="top"
                        fill="rgba(203, 213, 224, 0.7)"
                        formatter={(value) => `${value} min`}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Webinars by Region Pie Chart (Previous Version - kept as is) */}
            {webinarsByRegion.length > 0 && (
              <div className="chart-container lg:col-span-3">
                <h2 className="text-2xl font-semibold text-white mb-4 text-center">
                  Webinars by Region
                </h2>
                <div className="text-right text-gray-400 mb-2">
                  Total Regions: {webinarsByRegion.length}
                </div>
                <ResponsiveContainer width="100%" height={400}>
                  <PieChart margin={{ top: 10, right: 0, left: 0, bottom: 10 }}>
                    <Pie
                      data={webinarsByRegion}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={150}
                      fill="#8884d8"
                      labelLine={false}
                      label={renderCustomizedLabel}
                    >
                      {webinarsByRegion.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, name, props) => [
                        `${value} webinars (${props.payload.percentage}%)`,
                        props.payload.name,
                      ]}
                    />
                    <Legend
                      wrapperStyle={{ paddingTop: "20px", color: "#CBD5E0" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Region Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                  {webinarsByRegion.map((regionData, index) => (
                    <div key={index} className="card text-left">
                      <h3 className="text-sm font-medium text-gray-300">
                        {regionData.name}
                      </h3>
                      <p className="text-xs font-bold text-blue-400 mt-1">
                        Webinars: {regionData.value}
                      </p>
                      <p className="text-xs font-bold text-green-400 mt-1">
                        Attendees: {regionData.attendees}
                      </p>
                      <p className="text-xs font-bold text-yellow-400 mt-1">
                        Avg. Retention: {regionData.avgRetention} min
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Webinars by Country/Region Horizontal Bar Chart */}
            {webinarsByCountryRegion.length > 0 && (
              <div className="chart-container lg:col-span-3">
                <h2 className="text-2xl font-semibold text-white mb-4 text-center">
                  Webinars by Country/Region
                </h2>
                <div className="text-right text-gray-400 mb-2">
                  Total Groups: {webinarsByCountryRegion.length}
                </div>
                <ResponsiveContainer
                  width="100%"
                  height={Math.max(400, webinarsByCountryRegion.length * 30)}
                >
                  <BarChart
                    data={webinarsByCountryRegion}
                    layout="vertical"
                    margin={{ top: 10, right: 30, left: 150, bottom: 10 }}
                    barCategoryGap={5}
                  >
                    <CartesianGrid strokeDashArray="3 3" stroke="#4A5568" />
                    <XAxis
                      type="number"
                      tick={{ fill: "#A0AEC0" }}
                      label={{
                        value: "Number of Webinars",
                        position: "insideBottom",
                        offset: -5,
                        fill: "#A0AEC0",
                      }}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fill: "#A0AEC0", fontSize: 11 }}
                      width={150}
                      interval={0}
                    />
                    <Tooltip
                      formatter={(value, name, props) => [
                        `${value} webinars`,
                        props.payload.name,
                        `Attendees: ${props.payload.attendees}`,
                        `Avg. Retention: ${props.payload.avgRetention} min`,
                      ]}
                    />
                    <Bar
                      dataKey="webinars"
                      fill="#9F7AEA"
                      radius={[0, 10, 10, 0]}
                    >
                      <LabelList
                        dataKey="webinars"
                        position="right"
                        fill="#CBD5E0"
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                {/* Country/Region Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  {webinarsByCountryRegion.map((groupData, index) => (
                    <div key={index} className="card text-left">
                      <h3 className="text-sm font-medium text-gray-300">
                        {groupData.name}
                      </h3>
                      <p className="text-xs font-bold text-blue-400 mt-1">
                        Webinars: {groupData.webinars}
                      </p>
                      <p className="text-xs font-bold text-green-400 mt-1">
                        Attendees: {groupData.attendees}
                      </p>
                      <p className="text-xs font-bold text-yellow-400 mt-1">
                        Avg. Retention: {groupData.avgRetention} min
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Trend Analysis Card */}
            <div className="chart-container lg:col-span-3 mt-8">
              <h2 className="text-2xl font-semibold text-white mb-6 text-center">
                Trend Analysis
              </h2>
              <div className="flex flex-wrap justify-center gap-2 mb-6">
                <button
                  onClick={() => setSelectedTrendFilter("month")}
                  className={`py-2 px-4 rounded-lg font-medium transition-colors ${
                    selectedTrendFilter === "month"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}
                >
                  By Month
                </button>
                <button
                  onClick={() => setSelectedTrendFilter("dayOfWeek")}
                  className={`py-2 px-4 rounded-lg font-medium transition-colors ${
                    selectedTrendFilter === "dayOfWeek"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}
                >
                  By Day of Week
                </button>
                <button
                  onClick={() => setSelectedTrendFilter("topic")}
                  className={`py-2 px-4 rounded-lg font-medium transition-colors ${
                    selectedTrendFilter === "topic"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}
                >
                  By Topic
                </button>
                <button
                  onClick={() => setSelectedTrendFilter("country")}
                  className={`py-2 px-4 rounded-lg font-medium transition-colors ${
                    selectedTrendFilter === "country"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}
                >
                  By Country
                </button>
                <button
                  onClick={() => setSelectedTrendFilter("language")}
                  className={`py-2 px-4 rounded-lg font-medium transition-colors ${
                    selectedTrendFilter === "language"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}
                >
                  By Language
                </button>
              </div>

              {/* All trend analysis content is always rendered, visibility controlled by CSS for PDF */}
              <div className="trend-analysis-content-wrapper">
                <div
                  className={`trend-analysis-tab-pane ${
                    selectedTrendFilter === "month" ? "" : "hidden-tab-content"
                  }`}
                >
                  {csvData.length > 0 &&
                  trendData.month &&
                  trendData.month.length > 0 ? (
                    <ResponsiveContainer
                      key={"month-trend"}
                      width="100%"
                      height={400}
                    >
                      <LineChart
                        data={trendData.month}
                        margin={{ top: 10, right: 30, left: 20, bottom: 100 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
                        <XAxis
                          dataKey="name"
                          angle={-45}
                          textAnchor="end"
                          height={100}
                          tick={{ fill: "#A0AEC0", fontSize: 10 }}
                          interval={0}
                        />
                        <YAxis
                          yAxisId="left"
                          tick={{ fill: "#A0AEC0" }}
                          label={{
                            value: "Attendance Rate (%)",
                            angle: -90,
                            position: "insideLeft",
                            fill: "#A0AEC0",
                          }}
                        />
                        <YAxis
                          yAxisId="right"
                          orientation="right"
                          tick={{ fill: "#A0AEC0" }}
                          label={{
                            value: "Registration Rate (%)",
                            angle: 90,
                            position: "insideRight",
                            fill: "#A0AEC0",
                          }}
                        />
                        <Tooltip
                          cursor={{ stroke: "#A0AEC0", strokeWidth: 1 }}
                          formatter={(value, name) => [
                            `${value.toFixed(2)}%`,
                            name
                              .replace("attendanceRate", "Attendance Rate")
                              .replace("registrationRate", "Registration Rate"),
                          ]}
                        />
                        <Legend
                          wrapperStyle={{
                            paddingTop: "10px",
                            color: "#CBD5E0",
                          }}
                        />
                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="attendanceRate"
                          stroke="#48BB78"
                          activeDot={{ r: 6 }}
                          strokeWidth={2}
                          name="Attendance Rate (%)"
                        />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="registrationRate"
                          stroke="#F56565"
                          activeDot={{ r: 6 }}
                          strokeWidth={2}
                          name="Registration Rate (%)"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-center text-gray-400">
                      No data available for Trend Analysis by Month.
                    </p>
                  )}
                </div>

                <div
                  className={`trend-analysis-tab-pane ${
                    selectedTrendFilter === "dayOfWeek"
                      ? ""
                      : "hidden-tab-content"
                  }`}
                >
                  {csvData.length > 0 &&
                  trendData.dayOfWeek &&
                  trendData.dayOfWeek.length > 0 ? (
                    <ResponsiveContainer
                      key={"dayOfWeek-trend"}
                      width="100%"
                      height={400}
                    >
                      <LineChart
                        data={trendData.dayOfWeek}
                        margin={{ top: 10, right: 30, left: 20, bottom: 100 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
                        <XAxis
                          dataKey="name"
                          angle={-45}
                          textAnchor="end"
                          height={100}
                          tick={{ fill: "#A0AEC0", fontSize: 10 }}
                          interval={0}
                        />
                        <YAxis
                          yAxisId="left"
                          tick={{ fill: "#A0AEC0" }}
                          label={{
                            value: "Attendance Rate (%)",
                            angle: -90,
                            position: "insideLeft",
                            fill: "#A0AEC0",
                          }}
                        />
                        <YAxis
                          yAxisId="right"
                          orientation="right"
                          tick={{ fill: "#A0AEC0" }}
                          label={{
                            value: "Registration Rate (%)",
                            angle: 90,
                            position: "insideRight",
                            fill: "#A0AEC0",
                          }}
                        />
                        <Tooltip
                          cursor={{ stroke: "#A0AEC0", strokeWidth: 1 }}
                          formatter={(value, name) => [
                            `${value.toFixed(2)}%`,
                            name
                              .replace("attendanceRate", "Attendance Rate")
                              .replace("registrationRate", "Registration Rate"),
                          ]}
                        />
                        <Legend
                          wrapperStyle={{
                            paddingTop: "10px",
                            color: "#CBD5E0",
                          }}
                        />
                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="attendanceRate"
                          stroke="#48BB78"
                          activeDot={{ r: 6 }}
                          strokeWidth={2}
                          name="Attendance Rate (%)"
                        />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="registrationRate"
                          stroke="#F56565"
                          activeDot={{ r: 6 }}
                          strokeWidth={2}
                          name="Registration Rate (%)"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-center text-gray-400">
                      No data available for Trend Analysis by Day of Week.
                    </p>
                  )}
                </div>

                <div
                  className={`trend-analysis-tab-pane ${
                    selectedTrendFilter === "topic" ? "" : "hidden-tab-content"
                  }`}
                >
                  {csvData.length > 0 &&
                  trendData.topic &&
                  trendData.topic.length > 0 ? (
                    <ResponsiveContainer
                      key={"topic-trend"}
                      width="100%"
                      height={400}
                    >
                      <LineChart
                        data={trendData.topic}
                        margin={{ top: 10, right: 30, left: 20, bottom: 100 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
                        <XAxis
                          dataKey="name"
                          angle={-45}
                          textAnchor="end"
                          height={100}
                          tick={{ fill: "#A0AEC0", fontSize: 10 }}
                          interval={0}
                        />
                        <YAxis
                          yAxisId="left"
                          tick={{ fill: "#A0AEC0" }}
                          label={{
                            value: "Attendance Rate (%)",
                            angle: -90,
                            position: "insideLeft",
                            fill: "#A0AEC0",
                          }}
                        />
                        <YAxis
                          yAxisId="right"
                          orientation="right"
                          tick={{ fill: "#A0AEC0" }}
                          label={{
                            value: "Registration Rate (%)",
                            angle: 90,
                            position: "insideRight",
                            fill: "#A0AEC0",
                          }}
                        />
                        <Tooltip
                          cursor={{ stroke: "#A0AEC0", strokeWidth: 1 }}
                          formatter={(value, name) => [
                            `${value.toFixed(2)}%`,
                            name
                              .replace("attendanceRate", "Attendance Rate")
                              .replace("registrationRate", "Registration Rate"),
                          ]}
                        />
                        <Legend
                          wrapperStyle={{
                            paddingTop: "10px",
                            color: "#CBD5E0",
                          }}
                        />
                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="attendanceRate"
                          stroke="#48BB78"
                          activeDot={{ r: 6 }}
                          strokeWidth={2}
                          name="Attendance Rate (%)"
                        />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="registrationRate"
                          stroke="#F56565"
                          activeDot={{ r: 6 }}
                          strokeWidth={2}
                          name="Registration Rate (%)"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-center text-gray-400">
                      No data available for Trend Analysis by Topic.
                    </p>
                  )}
                </div>

                <div
                  className={`trend-analysis-tab-pane ${
                    selectedTrendFilter === "country"
                      ? ""
                      : "hidden-tab-content"
                  }`}
                >
                  {csvData.length > 0 &&
                  trendData.country &&
                  trendData.country.length > 0 ? (
                    <ResponsiveContainer
                      key={"country-trend"}
                      width="100%"
                      height={400}
                    >
                      <LineChart
                        data={trendData.country}
                        margin={{ top: 10, right: 30, left: 20, bottom: 100 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
                        <XAxis
                          dataKey="name"
                          angle={-45}
                          textAnchor="end"
                          height={100}
                          tick={{ fill: "#A0AEC0", fontSize: 10 }}
                          interval={0}
                        />
                        <YAxis
                          yAxisId="left"
                          tick={{ fill: "#A0AEC0" }}
                          label={{
                            value: "Attendance Rate (%)",
                            angle: -90,
                            position: "insideLeft",
                            fill: "#A0AEC0",
                          }}
                        />
                        <YAxis
                          yAxisId="right"
                          orientation="right"
                          tick={{ fill: "#A0AEC0" }}
                          label={{
                            value: "Registration Rate (%)",
                            angle: 90,
                            position: "insideRight",
                            fill: "#A0AEC0",
                          }}
                        />
                        <Tooltip
                          cursor={{ stroke: "#A0AEC0", strokeWidth: 1 }}
                          formatter={(value, name) => [
                            `${value.toFixed(2)}%`,
                            name
                              .replace("attendanceRate", "Attendance Rate")
                              .replace("registrationRate", "Registration Rate"),
                          ]}
                        />
                        <Legend
                          wrapperStyle={{
                            paddingTop: "10px",
                            color: "#CBD5E0",
                          }}
                        />
                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="attendanceRate"
                          stroke="#48BB78"
                          activeDot={{ r: 6 }}
                          strokeWidth={2}
                          name="Attendance Rate (%)"
                        />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="registrationRate"
                          stroke="#F56565"
                          activeDot={{ r: 6 }}
                          strokeWidth={2}
                          name="Registration Rate (%)"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-center text-gray-400">
                      No data available for Trend Analysis by Country.
                    </p>
                  )}
                </div>

                <div
                  className={`trend-analysis-tab-pane ${
                    selectedTrendFilter === "language"
                      ? ""
                      : "hidden-tab-content"
                  }`}
                >
                  {csvData.length > 0 &&
                  trendData.language &&
                  trendData.language.length > 0 ? (
                    <ResponsiveContainer
                      key={"language-trend"}
                      width="100%"
                      height={400}
                    >
                      <LineChart
                        data={trendData.language}
                        margin={{ top: 10, right: 30, left: 20, bottom: 100 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
                        <XAxis
                          dataKey="name"
                          angle={-45}
                          textAnchor="end"
                          height={100}
                          tick={{ fill: "#A0AEC0", fontSize: 10 }}
                          interval={0}
                        />
                        <YAxis
                          yAxisId="left"
                          tick={{ fill: "#A0AEC0" }}
                          label={{
                            value: "Attendance Rate (%)",
                            angle: -90,
                            position: "insideLeft",
                            fill: "#A0AEC0",
                          }}
                        />
                        <YAxis
                          yAxisId="right"
                          orientation="right"
                          tick={{ fill: "#A0AEC0" }}
                          label={{
                            value: "Registration Rate (%)",
                            angle: 90,
                            position: "insideRight",
                            fill: "#A0AEC0",
                          }}
                        />
                        <Tooltip
                          cursor={{ stroke: "#A0AEC0", strokeWidth: 1 }}
                          formatter={(value, name) => [
                            `${value.toFixed(2)}%`,
                            name
                              .replace("attendanceRate", "Attendance Rate")
                              .replace("registrationRate", "Registration Rate"),
                          ]}
                        />
                        <Legend
                          wrapperStyle={{
                            paddingTop: "10px",
                            color: "#CBD5E0",
                          }}
                        />
                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="attendanceRate"
                          stroke="#48BB78"
                          activeDot={{ r: 6 }}
                          strokeWidth={2}
                          name="Attendance Rate (%)"
                        />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="registrationRate"
                          stroke="#F56565"
                          activeDot={{ r: 6 }}
                          strokeWidth={2}
                          name="Registration Rate (%)"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-center text-gray-400">
                      No data available for Trend Analysis by Language.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* New section for LLM-powered insights */}
            <div className="chart-container lg:col-span-3 mt-8">
              <h2 className="text-2xl font-semibold text-white mb-4 text-center">
                AI-Powered Webinar Insights
              </h2>
              <div className="flex justify-center mb-4">
                <button
                  onClick={generateTopicInsights}
                  className={`font-semibold py-3 px-6 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105
                    ${
                      csvData.length > 0 && !isLoadingInsights
                        ? "bg-blue-600 hover:bg-blue-700 text-white"
                        : "bg-gray-600 text-gray-400 cursor-not-allowed"
                    }`}
                  disabled={csvData.length === 0 || isLoadingInsights}
                >
                  {isLoadingInsights
                    ? "Generating..."
                    : "✨ Generate Webinar Insights"}
                </button>
              </div>
              {topicInsights && (
                <div className="bg-gray-700 p-6 rounded-lg text-gray-200 text-left whitespace-pre-wrap">
                  {topicInsights}
                </div>
              )}
            </div>
          </div>
        ) : (
          <p className="text-center text-gray-400">
            Upload a CSV file and click "Generate Report" to visualize your
            data.
          </p>
        )}
      </div>
    </div>
  );
};

export default App;
