import React from "react";
import "../css/Searchbar.css";
import { Form, InputGroup } from 'react-bootstrap';
import { FaSearch } from "react-icons/fa";

export const Searchbar = ({ search, setSearch }) => {
  return (
    <div className="searchbar-container">
      <Form>
        <InputGroup>
          <Form.Control
            type="text"
            placeholder="Search..."
            className="searchbar-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <InputGroup.Text className="searchbar-icon" role="presentation" aria-hidden="true">
            <FaSearch />
          </InputGroup.Text>
        </InputGroup>
      </Form>
    </div>
  );
};
