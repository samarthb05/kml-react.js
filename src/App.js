import React, { useState } from "react";
import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
  Polygon,
} from "react-leaflet";
import { parseString } from "xml2js";
import "leaflet/dist/leaflet.css";

const App = () => {
  const [kmlData, setKmlData] = useState(null);
  const [summaryData, setSummaryData] = useState(null);
  const [detailedData, setDetailedData] = useState(null);

  // function to upload KML file
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const fileContent = e.target.result;
      console.log("Raw KML Content:", fileContent);

      parseString(fileContent, (err, result) => {
        if (err) {
          console.error("Error parsing KML file:", err);
          return;
        }

        console.log("Parsed JSON Data:", result);

        if (!result.kml || !result.kml.Document || !result.kml.Document[0]) {
          console.error("Invalid KML structure");
          return;
        }

        const document = result.kml.Document[0];

        //extract different elements
        const placemarks = document.Placemark || [];
        const polygons = placemarks.filter((p) => p.Polygon);
        const lines = placemarks.filter((p) => p.LineString);
        const points = placemarks.filter((p) => p.Point);

        console.log("Placemarks:", placemarks);
        console.log("Points:", points);
        console.log("Lines:", lines);
        console.log("Polygons:", polygons);

        setKmlData({
          placemarks,
          points,
          lines,
          polygons,
        });
      });
    };

    reader.readAsText(file);
  };

  //function to generate summary
  const handleSummary = () => {
    if (!kmlData || !kmlData.placemarks) {
      console.error("KML data is empty");
      return;
    }

    const summary = {
      totalPlacemarks: kmlData.placemarks.length,
      totalPoints: kmlData.points.length,
      totalLines: kmlData.lines.length,
      totalPolygons: kmlData.polygons.length,
    };

    console.log("Summary Data:", summary);
    setSummaryData(summary);
  };

  //function to generate report
  const handleDetailed = () => {
    if (!kmlData || !kmlData.lines) {
      console.error("No line data available");
      return;
    }

    let totalLineLength = 0;

    kmlData.lines.forEach((line) => {
      if (
        line.LineString &&
        line.LineString[0] &&
        line.LineString[0].coordinates
      ) {
        const coords = line.LineString[0].coordinates[0]
          .trim()
          .split(/\s+/)
          .map((coord) => coord.split(",").map(Number));

        for (let i = 0; i < coords.length - 1; i++) {
          const [lon1, lat1] = coords[i];
          const [lon2, lat2] = coords[i + 1];

          //calculate distance
          const R = 6371;
          const dLat = ((lat2 - lat1) * Math.PI) / 180;
          const dLon = ((lon2 - lon1) * Math.PI) / 180;
          const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos((lat1 * Math.PI) / 180) *
              Math.cos((lat2 * Math.PI) / 180) *
              Math.sin(dLon / 2) *
              Math.sin(dLon / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          totalLineLength += R * c;
        }
      }
    });

    const details = {
      totalLineLength: totalLineLength.toFixed(2) + " km",
    };

    console.log("Detailed Data:", details);
    setDetailedData(details);
  };

  return (
    <div>
      <h1>KML File Viewer</h1>

      {/* File Upload */}
      <input type="file" accept=".kml" onChange={handleFileUpload} />

      {/* Buttons */}
      <button onClick={handleSummary}>Show Summary</button>
      <button onClick={handleDetailed}>Show Details</button>

      {/* Summary Table */}
      {summaryData && (
        <div>
          <h2>Summary</h2>
          <table border="1">
            <thead>
              <tr>
                <th>Element Type</th>
                <th>Count</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Total Placemarks</td>
                <td>{summaryData.totalPlacemarks}</td>
              </tr>
              <tr>
                <td>Points</td>
                <td>{summaryData.totalPoints}</td>
              </tr>
              <tr>
                <td>Lines</td>
                <td>{summaryData.totalLines}</td>
              </tr>
              <tr>
                <td>Polygons</td>
                <td>{summaryData.totalPolygons}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Detailed Table */}
      {detailedData && (
        <div>
          <h2>Details</h2>
          <p>Total Line Length: {detailedData.totalLineLength}</p>
        </div>
      )}

      {/* Map Display */}
      <MapContainer
        center={[20, 77]}
        zoom={4}
        style={{ height: "400px", width: "100%" }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {/* Render Points */}
        {kmlData &&
          kmlData.points.map((point, index) => {
            if (point.Point && point.Point[0].coordinates) {
              const coords = point.Point[0].coordinates[0]
                .split(",")
                .map(Number);
              return <Marker key={index} position={[coords[1], coords[0]]} />;
            }
            return null;
          })}

        {/* Render Lines */}
        {kmlData &&
          kmlData.lines.map((line, index) => {
            if (line.LineString && line.LineString[0].coordinates) {
              const coords = line.LineString[0].coordinates[0]
                .trim()
                .split(/\s+/)
                .map((coord) => coord.split(",").map(Number))
                .map(([lon, lat]) => [lat, lon]);
              return <Polyline key={index} positions={coords} color="blue" />;
            }
            return null;
          })}

        {/* Render Polygons */}
        {kmlData &&
          kmlData.polygons.map((polygon, index) => {
            if (polygon.Polygon && polygon.Polygon[0].outerBoundaryIs) {
              const coords =
                polygon.Polygon[0].outerBoundaryIs[0].LinearRing[0].coordinates[0]
                  .trim()
                  .split(/\s+/)
                  .map((coord) => coord.split(",").map(Number))
                  .map(([lon, lat]) => [lat, lon]);
              return <Polygon key={index} positions={coords} color="green" />;
            }
            return null;
          })}
      </MapContainer>
    </div>
  );
};

export default App;
