CREATE TABLE Account (
Nummer Integer PRIMARY KEY,
Naam Text,
EmailAdres Text,
EmailAdresGeverifieerd Integer,
Geslacht Text,
FotoUrl Text,
Taal Text,
GoogleSub Text UNIQUE,
GoogleAccessToken Text,
GoogleExpiryDate Integer,
GoogleRefreshToken Text,
Geblokkeerd Integer,
LaatsteInlog Integer,
Klant Integer NULL,
CONSTRAINT FK_Klant FOREIGN KEY (Klant) REFERENCES Klant(Nummer)
);
CREATE TABLE Adres (
Nummer Integer PRIMARY KEY,
Postcode Text,
Plaats Text,
Straatnaam Text,
Huisnummer Text,
Toevoeging Text
);
CREATE TABLE Adresklant (
Nummer Integer PRIMARY KEY,
Adrestype Integer NOT NULL,
Klant Integer NOT NULL,
Adres Integer NOT NULL, Afstand Integer,
CONSTRAINT FK_Adrestype FOREIGN KEY (Adrestype) REFERENCES Adrestype(Nummer),
CONSTRAINT FK_Adres FOREIGN KEY (Adres) REFERENCES Adres(Nummer),
CONSTRAINT FK_Klant FOREIGN KEY (Klant) REFERENCES Klant(Nummer)
);
CREATE TABLE Adrestype (
Nummer INTEGER PRIMARY KEY,
Naam Text
);
CREATE TABLE Bestelling (
Nummer Integer PRIMARY KEY,
Klant Integer NOT NULL,
Tijdstip Text DEFAULT CURRENT_TIMESTAMP,
Verzendkosten Integer,
   CONSTRAINT FK_Verzendkosten FOREIGN KEY (Verzendkosten) REFERENCES Verzendkosten(Nummer),
CONSTRAINT FK_Klant FOREIGN KEY (Klant) REFERENCES Klant(Nummer)
);
CREATE TABLE Bestelling_Prijs_Afstand_Invoer (
   Bestelling_Prijs Real CONSTRAINT Bestelling_Prijs_constraint6 CHECK (Bestelling_Prijs >= 0),
   Adresklant_Afstand Integer CONSTRAINT Adresklant_Afstand_constraint6 CHECK (Adresklant_Afstand >= 0)
);
CREATE TABLE Bestelregel (
Nummer Integer PRIMARY KEY,
Bestelling Integer NOT NULL,
Productexemplaar Integer NOT NULL,
Teken Integer CONSTRAINT Teken_domein CHECK (Teken = -1 OR Teken = 1),
Prijs Real NOT NULL,
CONSTRAINT FK_Bestelling FOREIGN KEY (Bestelling) REFERENCES Bestelling(Nummer),
CONSTRAINT FK_Productexemplaar FOREIGN KEY (Productexemplaar) REFERENCES Productexemplaar(Nummer)
);
CREATE TABLE Betaling (
Nummer Integer PRIMARY KEY,
Factuur Integer NOT NULL,
Referentie Text,
Bedrag Real,
Teken Integer CONSTRAINT Teken_domein CHECK (Teken = -1 OR Teken = 1),
CONSTRAINT FK_Factuur FOREIGN KEY (Factuur) REFERENCES Factuur(Nummer)
);
CREATE TABLE Bezoeklog (
Nummer Integer PRIMARY KEY,
IpAdres Text,
Tijdstip Text DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE Factuur (
Nummer Integer PRIMARY KEY,
Kortingscode Text,
Bestelling Integer,
CONSTRAINT FK_Bestelling FOREIGN KEY (Bestelling) REFERENCES Bestelling(Nummer)
);
CREATE TABLE Factuurregel (
   Nummer Integer PRIMARY KEY,
   Factuur Integer NOT NULL,
   Bestelregel Integer,
   Verzendkosten Integer,
   Bedrag Real NOT NULL,
   Teken Integer CONSTRAINT Teken_domein CHECK (Teken = -1 OR Teken = 1),
   CONSTRAINT FK_Factuur FOREIGN KEY (Factuur) REFERENCES Factuur(Nummer),
   CONSTRAINT FK_Bestelregel FOREIGN KEY (Bestelregel) REFERENCES Bestelregel(Nummer),
   CONSTRAINT FK_Verzendkosten FOREIGN KEY (Verzendkosten) REFERENCES Verzendkosten(Nummer),
   CONSTRAINT Bestelregel_Verzendkosten_Not_Null CHECK (Bestelregel IS NOT NULL OR Verzendkosten IS NOT NULL)
);
CREATE TABLE Foto (
Nummer Integer PRIMARY KEY,
GTIN Text,
Afbeelding Blob,
Productgroep Integer,
Product Integer,
Productexemplaar Integer, BSIN Text, Merk Integer,
CONSTRAINT FK_Productgroep FOREIGN KEY (Productgroep) REFERENCES Productgroep(Nummer),
CONSTRAINT FK_Product FOREIGN KEY (Product) REFERENCES Product(Nummer),
CONSTRAINT FK_Productexemplaar FOREIGN KEY (Productexemplaar) REFERENCES Productexemplaar(Nummer)
);
CREATE TABLE Klant (
Nummer Integer PRIMARY KEY
, FactuurAdresGebruiken Integer, EmailAdres Text);
CREATE TABLE Merk (
Nummer Integer PRIMARY KEY,
BSIN Text,
Naam Text,
Website Text
);
CREATE TABLE Opdracht (
Nummer Integer PRIMARY KEY,
Naam Text,
Omschrijving Text,
Broncode Text,
Rapport Text
);
CREATE TABLE Product (
Nummer Integer PRIMARY KEY,
GTIN Text,
Productnaam Text,
VerpaktPer Integer,
Gegevensleverancier Text,
BSIN Text,
Merk Integer,
Productgroep Integer, Prijs Real,
CONSTRAINT FK_Merk FOREIGN KEY (Merk) REFERENCES Merk(nummer),
CONSTRAINT FK_Productgroep FOREIGN KEY (Productgroep) REFERENCES Productgroep(Nummer)
);
CREATE TABLE Productexemplaar (
Nummer Integer PRIMARY KEY,
Product Integer NOT NULL,
CONSTRAINT FK_Product FOREIGN KEY (Product) REFERENCES Product(Nummer)
);
CREATE TABLE Productgroep (
Nummer Integer PRIMARY KEY,
Gcp Text,
Omschrijving Text,
ProductgroepType Integer,
Productgroep Integer,
CONSTRAINT FK_ProductgroepType FOREIGN KEY (ProductgroepType) REFERENCES ProductgroepType(Nummer),
CONSTRAINT FK_Productgroep1 FOREIGN KEY (Productgroep) REFERENCES Productgroep(Nummer),
CONSTRAINT FK_Productgroep2 CHECK (Nummer <> Productgroep)
);
CREATE TABLE ProductgroepType (
Nummer Integer PRIMARY KEY,
Naam Text,
CONSTRAINT Omvang CHECK (Nummer <= 4)
);
CREATE TABLE Productnaamwoord(Woord PRIMARY KEY, Telling Integer);
CREATE TABLE Rapport (
Nummer Integer PRIMARY KEY,
Naam Text,
Omschrijving Text,
Broncode Text
);
CREATE TABLE Verzending (
   Nummer Integer PRIMARY KEY,
   Adresklant Integer NOT NULL,
   Afgeleverd Integer,
   CONSTRAINT FK_Adresklant FOREIGN KEY (Adresklant) REFERENCES Adresklant(Nummer)
);
CREATE TABLE Verzendkosten (
Nummer Integer PRIMARY KEY,
Prijs Real NOT NULL CONSTRAINT Prijs_constraint6 CHECK (Prijs >= 0),
Afstand Integer NOT NULL CONSTRAINT Afstand_constraint7 CHECK (Afstand >= 0), -- in meters
Kosten Real NOT NULL CONSTRAINT Kosten_constraint6 CHECK (Kosten >= 0)
);
CREATE TABLE Verzendregel (
   Nummer Integer PRIMARY KEY,
   Verzending Integer NOT NULL,
   Bestelregel Integer NOT NULL,
   CONSTRAINT FK_Verzending FOREIGN KEY (Verzending) REFERENCES Verzending(Nummer),
   CONSTRAINT FK_Bestelregel FOREIGN KEY (Bestelregel) REFERENCES Bestelregel(Nummer)
);
CREATE TABLE Willekeur (
Nummer Integer PRIMARY KEY,
Nummer_1 Integer,
Nummer_2 Integer
);
CREATE VIEW Bestelling_Prijs_Afstand AS
SELECT 
   -- De bestelling
   B.Nummer AS Bestelling_Nummer,  
   -- de prijs van de bestelling
   Coalesce((
      SELECT Sum(BR.Prijs * BR.Teken) 
      FROM Bestelregel BR 
      WHERE BR.Bestelling = B.Nummer
   ), 0) AS Bestelling_Prijs,
   -- en de afstand tot het verzendadres.
   Coalesce((
      SELECT Afstand 
      FROM Adresklant AK JOIN Adrestype AT ON AT.Nummer = AK.Adrestype 
      WHERE AK.Klant = B.Klant AND AT.Naam = 'Verzendadres'
      ORDER BY AK.Nummer DESC LIMIT 1
   ), 0) AS Adresklant_Afstand
FROM Bestelling B
UNION SELECT -1, Bestelling_Prijs, Adresklant_Afstand FROM Bestelling_Prijs_Afstand_Invoer;
CREATE VIEW Bestelling_constraint4 AS 
SELECT 
   B.Bestelling_Nummer, 
   (
      SELECT R.Nummer FROM Verzendkosten R
      WHERE 
         -- De eerste voorwaarde waarmee de equivalentieklasse wordt gedefinieerd.
         B.Bestelling_Prijs >= R.Prijs AND B.Adresklant_Afstand >= R.Afstand 
         -- De tweede voorwaarde van die definitie.
         AND NOT EXISTS (
            SELECT * FROM Verzendkosten S
            WHERE 
               B.Bestelling_Prijs >= S.Prijs AND B.Adresklant_Afstand >= S.Afstand 
               AND (R.Prijs < S.Prijs OR (R.Prijs = S.Prijs AND R.Afstand <= S.Afstand)) -- R gaat vooraf S
               AND NOT (R.Prijs = S.Prijs AND R.Afstand = S.Afstand) -- R is geen S
         )
   ) AS Verzendkosten_Nummer,
   B.Bestelling_Prijs,
   B.Adresklant_Afstand
FROM  Bestelling_Prijs_Afstand B;
CREATE VIEW Factuurregel_constraint3 AS
SELECT 
B1.Nummer AS Bestelling1, B2.Nummer AS Bestelling2, 
F.Nummer AS Factuur, FR.Nummer AS Factuurregel, BR.Nummer AS Bestelregel
FROM 
Factuurregel FR
JOIN Bestelregel BR ON BR.Nummer = FR.Bestelregel 
JOIN Bestelling B1 ON B1.Nummer = BR.Bestelling
JOIN Factuur F ON F.Nummer = FR.Factuur 
JOIN Bestelling B2 ON B2.Nummer = F.Bestelling
WHERE B1.Nummer != B2.Nummer;
CREATE VIEW Product_Productgroep_Nummer AS
SELECT Nummer FROM (
-- Product is toegekend aan een bouwsteen
SELECT A.Nummer
FROM Productgroep A 
JOIN Productgroep B ON (A.Nummer = B.Productgroep)
JOIN Productgroep C ON (B.Nummer = C.Productgroep)
JOIN Productgroep D ON (C.Nummer = D.Productgroep)
JOIN Product P ON P.Productgroep = D.Nummer

-- Product is toegekend aan een klasse
UNION SELECT B.Nummer
FROM Productgroep B 
JOIN Productgroep C ON (B.Nummer = C.Productgroep)
JOIN Productgroep D ON (C.Nummer = D.Productgroep)
JOIN Product P ON P.Productgroep = D.Nummer

-- Product is toegekend aan een familie
UNION SELECT C.Nummer
FROM Productgroep C 
JOIN Productgroep D ON (C.Nummer = D.Productgroep)
JOIN Product P ON P.Productgroep = D.Nummer

-- Product is toegekend aan een segment
UNION SELECT D.Nummer
FROM Productgroep D 
JOIN Product P ON P.Productgroep = D.Nummer
);
CREATE VIEW Productgroep_Foto AS 
SELECT Productgroep, Foto FROM (

-- Alle foto's die gerelateerd kunnen worden aan een productgroep zonder het tussenvoegen van een tweede productgroep.
SELECT PG1.Nummer AS Productgroep, F.Nummer AS Foto
FROM Productgroep PG1
JOIN Product P ON P.Productgroep = PG1.Nummer
JOIN Foto F ON F.Product = P.Nummer

-- Hetzelfde, maar nu één productgroep tussenvoegen.
UNION SELECT PG1.Nummer, F.Nummer
FROM Productgroep PG1
JOIN Productgroep PG2 ON PG2.Productgroep = PG1.Nummer
JOIN Product P ON P.Productgroep = PG2.Nummer
JOIN Foto F ON F.Product = P.Nummer

-- Twee productgroepen.
UNION SELECT PG1.Nummer, F.Nummer
FROM Productgroep PG1
JOIN Productgroep PG2 ON PG2.Productgroep = PG1.Nummer
JOIN Productgroep PG3 ON PG3.Productgroep = PG2.Nummer
JOIN Product P ON P.Productgroep = PG3.Nummer
JOIN Foto F ON F.Product = P.Nummer

-- Drie productgroepen.
UNION SELECT PG1.Nummer, F.Nummer
FROM Productgroep PG1
JOIN Productgroep PG2 ON PG2.Productgroep = PG1.Nummer
JOIN Productgroep PG3 ON PG3.Productgroep = PG2.Nummer
JOIN Productgroep PG4 ON PG4.Productgroep = PG3.Nummer
JOIN Product P ON P.Productgroep = PG4.Nummer
JOIN Foto F ON F.Product = P.Nummer

);
CREATE VIEW Verzendkosten_constraint8 AS
SELECT 'Constraint 8 onwaar' WHERE NOT EXISTS (SELECT * FROM Verzendkosten WHERE Prijs = 0 AND Afstand = 0 AND Kosten IS NOT NULL);
CREATE INDEX Account_EmailAdres ON Account(EmailAdres);
CREATE INDEX Account_Klant ON Account(Klant);
CREATE INDEX Adres_postcode_huisnummer ON Adres (Postcode, Huisnummer);
CREATE INDEX Adresklant_Adres ON Adresklant(Adres);
CREATE INDEX Adresklant_Klant_Adrestype ON Adresklant(Klant, Adrestype);
CREATE INDEX Bestelling_Klant ON Bestelling(Klant);
CREATE INDEX Bestelling_Verzendkosten ON Bestelling(Verzendkosten);
CREATE INDEX Bestelregel_Bestelling ON Bestelregel(Bestelling);
CREATE INDEX Bestelregel_Productexemplaar ON Bestelregel(Productexemplaar, Teken);
CREATE INDEX Betaling_Factuur ON Betaling(Factuur);
CREATE INDEX Bezoeklog_IpAdres ON Bezoeklog(IpAdres);
CREATE INDEX Factuur_Bestelling ON Factuur(Bestelling);
CREATE INDEX Factuurregel_Bestelregel ON Factuurregel(Bestelregel);
CREATE INDEX Factuurregel_Factuur ON Factuurregel(Factuur);
CREATE INDEX Factuurregel_Verzendkosten ON Factuurregel(Verzendkosten);
CREATE INDEX Foto_Merk ON Foto(Merk);
CREATE UNIQUE INDEX Foto_bsin ON Foto (BSIN);
CREATE UNIQUE INDEX Foto_gtin ON Foto (GTIN);
CREATE INDEX Foto_product ON Foto(Product);
CREATE INDEX Foto_productexemplaar ON Foto(Productexemplaar);
CREATE INDEX Foto_productgroep ON Foto(Productgroep);
CREATE UNIQUE INDEX Merk_bsin ON Merk (BSIN);
CREATE UNIQUE INDEX Product_gtin ON Product (GTIN);
CREATE INDEX Product_merk ON Product(Merk);
CREATE INDEX Product_productgroep ON Product(Productgroep);
CREATE INDEX Productexemplaar_Product ON Productexemplaar(Product);
CREATE INDEX Productgroep_Gcp ON Productgroep(Gcp);
CREATE INDEX Productgroep_Productgroep ON Productgroep(Productgroep);
CREATE INDEX Verzending_Adresklant ON Verzending(Adresklant);
CREATE UNIQUE INDEX Verzendkosten_constraint5 ON Verzendkosten(Prijs, Afstand);
CREATE INDEX Verzendregel_Bestelregel ON Verzendregel(Bestelregel);
CREATE INDEX Verzendregel_Verzending ON Verzendregel(Verzending);
CREATE TRIGGER Adresklant_constraint4_1
AFTER INSERT ON Adresklant
BEGIN
   UPDATE Bestelling SET Verzendkosten = 
      (SELECT Verzendkosten_Nummer 
      FROM Bestelling_constraint4 BC4
      WHERE BC4.Bestelling_Nummer = Bestelling.Nummer)
   WHERE Bestelling.Nummer IN (
         SELECT B.Nummer 
         FROM Bestelling B 
         WHERE B.Klant = NEW.Klant
            AND B.Nummer NOT IN (SELECT Bestelling FROM Factuur)
      );
END;
CREATE TRIGGER Adresklant_constraint4_2
AFTER UPDATE OF Afstand ON Adresklant
BEGIN
   UPDATE Bestelling SET Verzendkosten = 
      (SELECT Verzendkosten_Nummer 
      FROM Bestelling_constraint4 BC4
      WHERE BC4.Bestelling_Nummer = Bestelling.Nummer)
   WHERE Bestelling.Nummer IN (
         SELECT B.Nummer 
         FROM Bestelling B 
         WHERE B.Klant = NEW.Klant
            AND B.Nummer NOT IN (SELECT Bestelling FROM Factuur)
      );
END;
CREATE TRIGGER Bestelregel_constraint3
AFTER UPDATE OF Bestelling ON Bestelregel FOR EACH ROW 
BEGIN
SELECT RAISE(ROLLBACK, 'Constraint 3 op Factuurregel: de factuurregel verwijst via Bestelregel naar een andere Bestelling dan via Factuur.')
FROM Factuurregel_constraint3 FR_constraint3
WHERE FR_constraint3.Bestelregel = NEW.Nummer;
END;
CREATE TRIGGER Bestelregel_constraint4_1
AFTER INSERT ON Bestelregel
BEGIN
   UPDATE Bestelling SET Verzendkosten = 
      (SELECT Verzendkosten_Nummer 
      FROM Bestelling_constraint4 BC4
      WHERE BC4.Bestelling_Nummer = Bestelling.Nummer)
   WHERE Bestelling.Nummer = NEW.Bestelling;
END;
CREATE TRIGGER Bestelregel_constraint4_2
AFTER DELETE ON Bestelregel
BEGIN
   UPDATE Bestelling SET Verzendkosten = 
      (SELECT Verzendkosten_Nummer 
      FROM Bestelling_constraint4 BC4
      WHERE BC4.Bestelling_Nummer = Bestelling.Nummer)
   WHERE Bestelling.Nummer = OLD.Bestelling;
END;
CREATE TRIGGER Factuur_constraint3
AFTER UPDATE OF Bestelling ON Factuur FOR EACH ROW 
BEGIN
SELECT RAISE(ROLLBACK, 'Constraint 3 op Factuurregel: de factuurregel verwijst via Bestelregel naar een andere Bestelling dan via Factuur.')
FROM Factuurregel_constraint3 FR_constraint3
WHERE FR_constraint3.Factuur = NEW.Nummer;
END;
CREATE TRIGGER Verzendkosten_constraint8_1
AFTER INSERT ON Verzendkosten FOR EACH ROW 
BEGIN
SELECT RAISE(ROLLBACK, 'Constraint 8 op Verzendkosten: de verzendkostentabel moet tenminste één rij bevatten met Prijs = 0, Afstand = 0 en een zekere waarde voor de Verzendkosten.')
FROM Verzendkosten_constraint8;
END;
CREATE TRIGGER Verzendkosten_constraint8_2
AFTER UPDATE OF Prijs, Afstand ON Verzendkosten FOR EACH ROW 
BEGIN
SELECT RAISE(ROLLBACK, 'Constraint 8 op Verzendkosten: de verzendkostentabel moet tenminste één rij bevatten met Prijs = 0, Afstand = 0 en een zekere waarde voor de Verzendkosten.')
FROM Verzendkosten_constraint8;
END;
CREATE TRIGGER Verzendkosten_constraint8_3
AFTER DELETE ON Verzendkosten FOR EACH ROW
BEGIN
SELECT RAISE(ROLLBACK, 'Constraint 8 op Verzendkosten: de verzendkostentabel moet tenminste één rij bevatten met Prijs = 0, Afstand = 0 en een zekere waarde voor de Verzendkosten.')
FROM Verzendkosten_constraint8;
END;
