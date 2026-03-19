import { Link } from 'react-router-dom'
import './MangaCard.css'

interface MangaCardProps {
  id: string
  title: string
  author: string
  coverImage: string
  description?: string
  chapters?: number
  views?: number
}

export default function MangaCard({
  id,
  title,
  author,
  coverImage,
  description,
  chapters = 0,
  views = 0,
}: MangaCardProps) {
  return (
    <Link to={`/manga/${id}`} className="card">
      <div>
        <img src={coverImage} alt={title} />
        <h3 className="cardTitle">{title}</h3>
        <p className="cardAuthor">Par {author}</p>
        {description && <p>{description}</p>}
        <span>{chapters} chapitres</span>
        <span>{views.toLocaleString()} vues</span>
      </div>
    </Link>
  )
}
