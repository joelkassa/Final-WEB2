INSERT INTO categories (name) VALUES
('Plumbing'),
('Electrical'),
('Hairstyling'),
('Catering'),
('Cleaning'),
('Freelance Design'),
('Freelance Development'),
('Photography'),
('Tutoring'),
('Event Planning')
ON CONFLICT (name) DO NOTHING;



