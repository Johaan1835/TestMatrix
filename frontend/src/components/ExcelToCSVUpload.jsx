import React, { useState, useRef, useContext } from 'react';
import ExcelJS from 'exceljs';
import axios from 'axios';
import '../css/ExcelToCSVUpload.css';
import { BaseUrlContext } from '../context/BaseUrlContext';

export default function ExcelToCSVUpload({
  uploadUrl, // don't hardcode here
  tableName = 'master_table',
  onUploadSuccess = () => {},
  onUploadError = () => {},
}) {
  const baseUrl = useContext(BaseUrlContext);
  const finalUploadUrl = uploadUrl || `${baseUrl}:5000/upload-csv`;

  const fileInputRef = useRef();
  const [askSuite, setAskSuite] = useState(false);
  const [suiteName, setSuiteName] = useState('');
  const [excelData, setExcelData] = useState(null);

  const handleButtonClick = () => {
    fileInputRef.current.click();
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(evt.target.result);
        const worksheet = workbook.getWorksheet(1);
        const headerRow = worksheet.getRow(1);
        let headers = headerRow.values.slice(1).map(h => (typeof h === 'string' ? h.trim() : h));

        const rows = [];
        worksheet.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return; // skip header

          const rowValues = row.values.slice(1);
          const normalizedRow = rowValues.map((cell) => {
            if (cell === null || cell === undefined) return '';

            if (typeof cell === 'object') {
              if (cell.text) return cell.text;
              if (cell.richText) return cell.richText.map(rt => rt.text).join('');
              if (cell.formula && cell.result !== undefined) return String(cell.result);
              return JSON.stringify(cell);
            }

            return String(cell);
          });

          while (normalizedRow.length < headers.length) {
            normalizedRow.push('');
          }

          rows.push(normalizedRow);
        });

        if (!headers.includes('test_suite')) {
          setAskSuite(true);
          setExcelData({ headers, rows });
        } else {
          uploadCSV(headers, rows);
        }
      } catch (err) {
        console.error(err);
        onUploadError(err);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const uploadCSV = async (headers, rows) => {
    if (!headers.includes('test_suite') && suiteName.trim() === '') {
      alert('Please enter a test suite name');
      return;
    }

    if (!headers.includes('test_suite')) {
      headers.push('test_suite');
      rows = rows.map((row) => [...row, suiteName]);
    }

    const csvLines = [headers.join(',')];
    rows.forEach((row) => {
      const escaped = row.map((cell) => {
        if (cell == null) return '';
        const str = cell.toString();
        if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      });
      csvLines.push(escaped.join(','));
    });

    const csvText = csvLines.join('\n');

    try {
      await axios.post(finalUploadUrl, {
        tableName,
        csvData: csvText,
        ...(headers.includes('test_suite') ? {} : { testSuite: suiteName.trim() }),
      });
      setAskSuite(false);
      setSuiteName('');
      setExcelData(null);
      onUploadSuccess();
    } catch (err) {
      console.error(err);
      onUploadError(err);
    }
  };

  return (
    <>
      <button className="excel-upload-button" onClick={handleButtonClick}>
        Upload Excel
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={handleFileUpload}
        style={{ display: 'none' }}
      />

      {askSuite && (
        <div style={{ marginTop: '10px' }}>
          <input
            type="text"
            placeholder="Enter test suite name"
            value={suiteName}
            onChange={(e) => setSuiteName(e.target.value)}
            style={{ padding: '8px', borderRadius: '4px' }}
          />
          <button
            className="excel-upload-button"
            style={{ marginLeft: '10px' }}
            onClick={() => uploadCSV(excelData.headers, excelData.rows)}
          >
            Confirm Upload
          </button>
        </div>
      )}
    </>
  );
}
